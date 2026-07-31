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
	project?: string;
	date?: string;
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
