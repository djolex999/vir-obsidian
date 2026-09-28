import type {
	VirReviewAction,
	VirReviewActionResult,
	VirReviewItem,
	VirReviewQueue,
} from "./types";
import { VirCLIError, VirNotFoundError, VirTimeoutError } from "./vir-client";
import { insertItem, rejectedName, removeItem } from "./lib/review-queue";

// No Obsidian imports: this runs under vitest in Node. Views subscribe with
// onChange and must unsubscribe (they pass the returned function to register()).

export interface ReviewClient {
	reviewQueue(): Promise<VirReviewQueue>;
	review(action: VirReviewAction, target: string): Promise<VirReviewActionResult>;
}

export interface ReviewSnapshot {
	items: VirReviewItem[];
	counts: { unaudited: number; stale: number };
	fetchedAt: number | null;
	inFlight: boolean;
	error: string | null;
	notConfigured: boolean;
}

export type FailureReason = "busy" | "not_found" | "timeout" | "not_configured" | "in_flight" | "error";

export type ActionOutcome =
	| { ok: true; removed: VirReviewItem | null; index: number; result: VirReviewActionResult }
	| { ok: false; reason: FailureReason; message: string };

export const BUSY_MESSAGE = "vir is busy (a run is in progress). Try again in a moment.";
export const TIMEOUT_MESSAGE = "Couldn't confirm; queue refreshed";

export class ReviewStore {
	private items: VirReviewItem[] = [];
	private counts = { unaudited: 0, stale: 0 };
	private fetchedAt: number | null = null;
	private inFlight = false;
	private error: string | null = null;
	private notConfigured = false;
	private readonly listeners = new Set<() => void>();

	constructor(
		private readonly getClient: () => ReviewClient,
		private readonly now: () => number = Date.now,
	) {}

	get snapshot(): ReviewSnapshot {
		return {
			items: this.items,
			counts: this.counts,
			fetchedAt: this.fetchedAt,
			inFlight: this.inFlight,
			error: this.error,
			notConfigured: this.notConfigured,
		};
	}

	onChange(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	// The tab and the card can both ask for the first fetch; share one spawn.
	private pendingRefresh: Promise<void> | null = null;

	refresh(): Promise<void> {
		this.pendingRefresh ??= this.fetchQueue().finally(() => {
			this.pendingRefresh = null;
		});
		return this.pendingRefresh;
	}

	private async fetchQueue(): Promise<void> {
		try {
			const q = await this.getClient().reviewQueue();
			this.items = q.items;
			this.counts = q.counts;
			this.fetchedAt = this.now();
			this.error = null;
			this.notConfigured = false;
		} catch (err) {
			this.notConfigured = err instanceof VirNotFoundError;
			this.error = this.notConfigured ? null : errorMessage(err);
		}
		this.emit();
	}

	async act(action: "approve" | "reject", path: string): Promise<ActionOutcome> {
		return this.guarded(async () => {
			const result = await this.getClient().review(action, path);
			const r = removeItem(this.items, path);
			this.items = r.items;
			return { ok: true, removed: r.removed, index: r.index, result };
		}, path);
	}

	async undoReject(item: VirReviewItem | null, index: number, rejectedPath: string): Promise<ActionOutcome> {
		return this.guarded(async () => {
			const result = await this.getClient().review("restore", rejectedName(rejectedPath));
			if (item) this.items = insertItem(this.items, item, index);
			await this.refresh();
			return { ok: true, removed: null, index, result };
		}, null);
	}

	// One action at a time; every failure maps to a reason the UI can phrase.
	// When the outcome is unknown (timeout) or the queue is wrong (not_found),
	// refetch: the CLI is the source of truth, never a local guess.
	private async guarded(fn: () => Promise<ActionOutcome>, path: string | null): Promise<ActionOutcome> {
		if (this.inFlight) return { ok: false, reason: "in_flight", message: "" };
		this.inFlight = true;
		this.emit();
		try {
			return await fn();
		} catch (err) {
			if (err instanceof VirTimeoutError) {
				await this.refresh();
				return { ok: false, reason: "timeout", message: TIMEOUT_MESSAGE };
			}
			if (err instanceof VirNotFoundError) {
				return { ok: false, reason: "not_configured", message: "Vir CLI not configured." };
			}
			if (err instanceof VirCLIError && err.kind === "busy") {
				return { ok: false, reason: "busy", message: BUSY_MESSAGE };
			}
			if (err instanceof VirCLIError && err.kind === "not_found") {
				if (path !== null) this.items = removeItem(this.items, path).items;
				await this.refresh();
				return { ok: false, reason: "not_found", message: err.message };
			}
			return { ok: false, reason: "error", message: errorMessage(err) };
		} finally {
			this.inFlight = false;
			this.emit();
		}
	}

	private emit(): void {
		for (const fn of this.listeners) fn();
	}
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
