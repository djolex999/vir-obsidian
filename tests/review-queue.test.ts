import { describe, it, expect } from "vitest";
import type { VirReviewItem } from "../src/types";
import {
	findItem,
	insertItem,
	isAtLeast,
	isReviewablePath,
	nextItem,
	rejectedName,
	removeItem,
} from "../src/lib/review-queue";

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
const q = [item("patterns/a.md"), item("patterns/b.md"), item("patterns/c.md")];

describe("isAtLeast", () => {
	it("compares numerically, not lexically", () => {
		expect(isAtLeast("0.23.0", "0.23.0")).toBe(true);
		expect(isAtLeast("0.100.0", "0.23.0")).toBe(true);
		expect(isAtLeast("0.22.1", "0.23.0")).toBe(false);
		expect(isAtLeast("1.0.0", "0.23.0")).toBe(true);
	});
	it("ignores a prerelease suffix and treats garbage as too old", () => {
		expect(isAtLeast("0.23.0-rc.1", "0.23.0")).toBe(true);
		expect(isAtLeast("unknown", "0.23.0")).toBe(false);
	});
});

describe("isReviewablePath", () => {
	it("accepts <category-dir>/<name>.md", () => {
		for (const p of ["patterns/a.md", "gotchas/a b.md", "decisions/-x.md", "tools/t.md"]) {
			expect(isReviewablePath(p)).toBe(true);
		}
	});
	it("rejects source notes, archived notes, nesting and a vault opened above the output dir", () => {
		for (const p of ["topics/t.md", "articles/a.md", "archived/a.md", "patterns/sub/a.md", "vir/patterns/x.md", "patterns/a.txt"]) {
			expect(isReviewablePath(p)).toBe(false);
		}
	});
});

describe("rejectedName", () => {
	it("returns the file name of a .rejected/ path", () => {
		expect(rejectedName(".rejected/a-abc.md")).toBe("a-abc.md");
	});
});

describe("queue edits", () => {
	it("finds by path", () => {
		expect(findItem(q, "patterns/b.md")?.path).toBe("patterns/b.md");
		expect(findItem(q, "patterns/z.md")).toBeUndefined();
	});
	it("removes and reports the index without mutating the input", () => {
		const r = removeItem(q, "patterns/b.md");
		expect(r.items.map((i) => i.path)).toEqual(["patterns/a.md", "patterns/c.md"]);
		expect(r.removed?.path).toBe("patterns/b.md");
		expect(r.index).toBe(1);
		expect(q).toHaveLength(3);
	});
	it("reports index -1 for a path not in the queue", () => {
		const r = removeItem(q, "patterns/z.md");
		expect(r).toEqual({ items: q, removed: null, index: -1 });
	});
	it("inserts at a clamped index and never duplicates", () => {
		const two = [item("patterns/a.md"), item("patterns/c.md")];
		expect(insertItem(two, item("patterns/b.md"), 1).map((i) => i.path)).toEqual(["patterns/a.md", "patterns/b.md", "patterns/c.md"]);
		expect(insertItem(two, item("patterns/b.md"), 99).map((i) => i.path)).toEqual(["patterns/a.md", "patterns/c.md", "patterns/b.md"]);
		expect(insertItem(two, item("patterns/a.md"), 1)).toHaveLength(2);
	});
	it("next is the item now at the removed index, wrapping to the first", () => {
		const after = [item("patterns/a.md"), item("patterns/c.md")];
		expect(nextItem(after, 1)?.path).toBe("patterns/c.md");
		expect(nextItem(after, 2)?.path).toBe("patterns/a.md");
		expect(nextItem([], 0)).toBeUndefined();
	});
});
