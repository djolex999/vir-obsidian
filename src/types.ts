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
	/** null when Ollama is unreachable (mirrors vir-cli output/json.ts). */
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
