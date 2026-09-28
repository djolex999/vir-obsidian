import { describe, it, expect, vi } from "vitest";
import { ReviewStore, BUSY_MESSAGE, TIMEOUT_MESSAGE, type ReviewClient } from "../src/review-store";
import { VirCLIError, VirNotFoundError, VirTimeoutError } from "../src/vir-client";
import type { VirReviewItem, VirReviewQueue } from "../src/types";

const item = (path: string): VirReviewItem => ({
	path,
	sessionId: path,
	title: path,
	category: "pattern",
	project: null,
	date: "2026-09-01",
	confidence: 0.9,
	verdict: "verify",
	reason: "r",
	mergeInto: null,
	auditedAt: "2026-09-26",
});
const queue = (...paths: string[]): VirReviewQueue => ({
	items: paths.map(item),
	counts: { unaudited: 2, stale: 1 },
});

function stub(q: VirReviewQueue) {
	const client = {
		reviewQueue: vi.fn(async () => q),
		review: vi.fn(async (action: "approve" | "reject" | "restore", target: string) => ({
			action,
			path: action === "reject" ? `.rejected/${target.split("/").pop()}` : target,
			sessionId: "sid",
		})),
	} satisfies ReviewClient;
	const store = new ReviewStore(() => client, () => 1_000);
	return { client, store };
}

describe("ReviewStore", () => {
	it("refresh loads items, counts and fetch time, and notifies", async () => {
		const { store } = stub(queue("patterns/a.md"));
		const seen = vi.fn();
		store.onChange(seen);
		await store.refresh();
		expect(store.snapshot).toMatchObject({ counts: { unaudited: 2, stale: 1 }, fetchedAt: 1_000, error: null });
		expect(store.snapshot.items).toHaveLength(1);
		expect(seen).toHaveBeenCalled();
	});

	it("refresh records a missing CLI separately from other errors", async () => {
		const { client, store } = stub(queue());
		client.reviewQueue.mockRejectedValueOnce(new VirNotFoundError());
		await store.refresh();
		expect(store.snapshot.notConfigured).toBe(true);
		client.reviewQueue.mockRejectedValueOnce(new Error("boom"));
		await store.refresh();
		expect(store.snapshot).toMatchObject({ notConfigured: false, error: "boom" });
	});

	it("concurrent refreshes share one fetch", async () => {
		const { client, store } = stub(queue("patterns/a.md"));
		await Promise.all([store.refresh(), store.refresh()]);
		expect(client.reviewQueue).toHaveBeenCalledTimes(1);
	});

	it("approve removes the item and reports where it was", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		const out = await store.act("approve", "patterns/a.md");
		expect(client.review).toHaveBeenCalledWith("approve", "patterns/a.md");
		expect(out).toMatchObject({ ok: true, index: 0, removed: { path: "patterns/a.md" } });
		expect(store.snapshot.items.map((i) => i.path)).toEqual(["patterns/b.md"]);
		expect(store.snapshot.inFlight).toBe(false);
	});

	it("rejecting the last item leaves an empty queue", async () => {
		const { store } = stub(queue("patterns/a.md"));
		await store.refresh();
		const out = await store.act("reject", "patterns/a.md");
		expect(out.ok).toBe(true);
		expect(store.snapshot.items).toEqual([]);
	});

	it("acting on a note that is not in the queue still succeeds (index -1)", async () => {
		const { store } = stub(queue("patterns/a.md"));
		await store.refresh();
		expect(await store.act("approve", "patterns/unflagged.md")).toMatchObject({ ok: true, index: -1, removed: null });
		expect(store.snapshot.items).toHaveLength(1);
	});

	it("busy leaves the queue untouched", async () => {
		const { client, store } = stub(queue("patterns/a.md"));
		await store.refresh();
		client.review.mockRejectedValueOnce(new VirCLIError("held", "", 1, "busy"));
		expect(await store.act("reject", "patterns/a.md")).toEqual({ ok: false, reason: "busy", message: BUSY_MESSAGE });
		expect(store.snapshot.items).toHaveLength(1);
	});

	it("not_found drops the item and refetches", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		client.reviewQueue.mockResolvedValueOnce(queue("patterns/b.md"));
		client.review.mockRejectedValueOnce(new VirCLIError("no note at patterns/a.md", "", 1, "not_found"));
		const out = await store.act("approve", "patterns/a.md");
		expect(out).toEqual({ ok: false, reason: "not_found", message: "no note at patterns/a.md" });
		expect(client.reviewQueue).toHaveBeenCalledTimes(2);
		expect(store.snapshot.items.map((i) => i.path)).toEqual(["patterns/b.md"]);
	});

	it("a timeout refetches instead of guessing", async () => {
		const { client, store } = stub(queue("patterns/a.md"));
		await store.refresh();
		client.review.mockRejectedValueOnce(new VirTimeoutError());
		expect(await store.act("approve", "patterns/a.md")).toEqual({ ok: false, reason: "timeout", message: TIMEOUT_MESSAGE });
		expect(client.reviewQueue).toHaveBeenCalledTimes(2);
	});

	it("refuses a second action while one is in flight", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		let release!: () => void;
		client.review.mockImplementationOnce(
			() => new Promise((r) => (release = () => r({ action: "approve", path: "patterns/a.md", sessionId: "sid" }))),
		);
		const first = store.act("approve", "patterns/a.md");
		expect(store.snapshot.inFlight).toBe(true);
		expect(await store.act("approve", "patterns/b.md")).toMatchObject({ ok: false, reason: "in_flight" });
		release();
		expect((await first).ok).toBe(true);
	});

	it("undo restores by file name, re-inserts at the old index and refetches", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		const out = await store.act("reject", "patterns/a.md");
		if (!out.ok) throw new Error("reject failed");
		client.reviewQueue.mockResolvedValueOnce(queue("patterns/a.md", "patterns/b.md"));
		const undo = await store.undoReject(out.removed, out.index, out.result.path);
		expect(client.review).toHaveBeenLastCalledWith("restore", "a.md");
		expect(undo.ok).toBe(true);
		expect(store.snapshot.items.map((i) => i.path)).toEqual(["patterns/a.md", "patterns/b.md"]);
	});

	it("a refused undo leaves the queue as it was and returns the CLI message", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		const out = await store.act("reject", "patterns/a.md");
		if (!out.ok) throw new Error("reject failed");
		client.review.mockRejectedValueOnce(new VirCLIError("patterns/a.md already exists — not overwriting it", "", 1, "internal"));
		const undo = await store.undoReject(out.removed, out.index, out.result.path);
		expect(undo).toEqual({ ok: false, reason: "error", message: "patterns/a.md already exists — not overwriting it" });
		expect(store.snapshot.items.map((i) => i.path)).toEqual(["patterns/b.md"]);
	});
	it("whenIdle resolves immediately when nothing is in flight", async () => {
		const { store } = stub(queue("patterns/a.md"));
		await expect(store.whenIdle()).resolves.toBeUndefined();
	});

	it("undoReject called while an act is in flight waits, then succeeds", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		const rej = await store.act("reject", "patterns/a.md");
		if (!rej.ok) throw new Error("reject failed");
		let release!: () => void;
		client.review.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					release = () => resolve({ action: "approve", path: "patterns/b.md", sessionId: "sid" });
				}),
		);
		const approving = store.act("approve", "patterns/b.md");
		const undoing = store.undoReject(rej.removed, rej.index, rej.result.path);
		release();
		await approving;
		const undo = await undoing;
		expect(undo.ok).toBe(true);
	});

	it("undo returning busy leaves the queue unchanged and reports busy", async () => {
		const { client, store } = stub(queue("patterns/a.md", "patterns/b.md"));
		await store.refresh();
		const out = await store.act("reject", "patterns/a.md");
		if (!out.ok) throw new Error("reject failed");
		client.review.mockRejectedValueOnce(new VirCLIError("locked", "", 1, "busy"));
		const undo = await store.undoReject(out.removed, out.index, out.result.path);
		expect(undo).toMatchObject({ ok: false, reason: "busy" });
		expect(store.snapshot.items.map((i) => i.path)).toEqual(["patterns/b.md"]);
	});
});
