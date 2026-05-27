import type { VirDoctorResult } from "../types";
import { VirNotFoundError } from "../vir-client";
import { relativeTime } from "./format";

export interface DaemonStatusView {
	cls: "is-ok" | "is-stale" | "is-down" | "is-unknown";
	tooltip: string;
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
