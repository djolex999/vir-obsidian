import { describe, it, expect } from "vitest";
import { resolveDaemonStatus } from "../src/lib/status";
import { VirNotFoundError, VirTimeoutError, VirCLIError } from "../src/vir-client";
import type { VirDoctorResult } from "../src/types";

const NOW = Date.parse("2026-05-27T12:00:00.000Z");
const base: VirDoctorResult = {
	daemon: "ok",
	lastPollAt: "2026-05-27T11:55:00.000Z",
	lastDistillAt: null,
	dbSizeMb: 1,
	vaultPath: "/x",
	configValid: true,
	ollama: { reachable: true, model: "m" },
	version: "0.7.1",
};

describe("resolveDaemonStatus", () => {
	it("ok -> green healthy", () => {
		expect(resolveDaemonStatus({ ...base, daemon: "ok" }, NOW)).toEqual({
			cls: "is-ok",
			tooltip: "Vir: daemon healthy",
		});
	});
	it("stale -> yellow with relative last poll", () => {
		expect(resolveDaemonStatus({ ...base, daemon: "stale" }, NOW)).toEqual({
			cls: "is-stale",
			tooltip: "Vir: last poll 5m ago",
		});
	});
	it("down -> red not running", () => {
		expect(resolveDaemonStatus({ ...base, daemon: "down" }, NOW)).toEqual({
			cls: "is-down",
			tooltip: "Vir: daemon not running",
		});
	});
	it("VirNotFoundError -> gray CLI not found", () => {
		expect(resolveDaemonStatus(new VirNotFoundError(), NOW)).toEqual({
			cls: "is-unknown",
			tooltip: "Vir: CLI not found",
		});
	});
	it("timeout / CLI error -> red unreachable", () => {
		expect(resolveDaemonStatus(new VirTimeoutError(), NOW)).toEqual({
			cls: "is-down",
			tooltip: "Vir: daemon unreachable",
		});
		expect(resolveDaemonStatus(new VirCLIError("x", "", 1), NOW)).toEqual({
			cls: "is-down",
			tooltip: "Vir: daemon unreachable",
		});
	});
});
