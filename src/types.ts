export type VirCategory =
	| "pattern"
	| "gotcha"
	| "decision"
	| "tool"
	| "article"
	| "topic"
	| "pdf";

export type DaemonState = "ok" | "stale" | "down";

export interface VirQueryResult {
	path: string;
	score: number;
	category: VirCategory;
	confidence: number;
	preview: string;
	/** null, not absent, when the note has no project (vir-cli json.ts). */
	project: string | null;
	/** ISO 8601, possibly date-only; "" when the note has no date. */
	date: string;
}

export interface VirOllamaStatus {
	reachable: boolean;
	/**
	 * Embed-probe result, not a reachability echo (vir-cli ≥ 0.14.0): the model
	 * id when a one-shot embed succeeded, null on unreachable OR probe failure —
	 * so {reachable: true, model: null} is a legal state. Branch on `reachable`.
	 */
	model: string | null;
}

export interface VirDoctorResult {
	daemon: DaemonState;
	lastPollAt: string | null;
	lastDistillAt: string | null;
	dbSizeMb: number;
	vaultPath: string;
	configValid: boolean;
	ollama: VirOllamaStatus;
	version: string;
}

/** Forward-compat error payload emitted by vir on non-zero exit. Render `error` only. */
export interface VirErrorPayload {
	error: string;
	kind?: string;
}

export type VirReviewVerdict = "reject" | "merge" | "verify";

export interface VirReviewMergeTarget {
	sessionId: string;
	path: string | null;
	title: string | null;
}

/** One `vir review --audited --json` row (vir-cli ≥ 0.23.0). */
export interface VirReviewItem {
	path: string;
	sessionId: string;
	title: string;
	category: VirCategory;
	project: string | null;
	date: string;
	confidence: number;
	verdict: VirReviewVerdict;
	reason: string;
	mergeInto: VirReviewMergeTarget | null;
	auditedAt: string;
}

export interface VirReviewQueue {
	items: VirReviewItem[];
	counts: { unaudited: number; stale: number };
}

export type VirReviewAction = "approve" | "reject" | "restore";

export interface VirReviewActionResult {
	action: VirReviewAction;
	/** Where the note is now; `.rejected/<name>` after a reject. */
	path: string;
	sessionId: string;
}
