import type { VirDoctorResult, VirOllamaStatus } from "../types";
import { VirNotFoundError } from "../vir-client";
import { relativeTime } from "./format";

export interface DaemonStatusView {
	cls: "is-ok" | "is-stale" | "is-down" | "is-unknown";
	tooltip: string;
}

// Since vir-cli 0.14.0, `model` is a live embed-probe result, not an echo of
// reachability — {reachable: true, model: null} means the daemon answered but
// the embed model is broken/deleted. Branch on `reachable`, never on `model`.
export function ollamaSummary(ollama: VirOllamaStatus): string {
	if (!ollama.reachable) return "Ollama unreachable";
	if (ollama.model === null) {
		return "Ollama reachable but embed probe failed — check `ollama list` for nomic-embed-text";
	}
	return `Ollama ${ollama.model}`;
}

export function resolveDaemonStatus(
	result: VirDoctorResult | Error,
	now: number = Date.now(),
): DaemonStatusView {
	if (result instanceof Error) {
		if (result instanceof VirNotFoundError) {
			return { cls: "is-unknown", tooltip: "Vir: CLI not found" };
		}
		return { cls: "is-down", tooltip: "Vir: daemon unreachable" };
	}

	switch (result.daemon) {
		case "ok":
			return { cls: "is-ok", tooltip: "Vir: daemon healthy" };
		case "stale":
			return {
				cls: "is-stale",
				tooltip: `Vir: last poll ${relativeTime(result.lastPollAt, now)}`,
			};
		case "down":
		default:
			return { cls: "is-down", tooltip: "Vir: daemon not running" };
	}
}
