import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VIR_CATEGORIES } from "../../src/lib/frontmatter";

// Contract tests: parse REAL `vir --json` output (captured verbatim into
// fixtures/, never hand-written) against the shape src/types.ts declares.
// A failure here means the CLI wire format and the plugin's hand-mirrored
// types have drifted — fix types.ts (and its render sites), then refresh
// the fixture with the capture commands in fixtures/README.md.

function load(name: string): unknown {
	return JSON.parse(
		readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"),
	);
}

function kind(v: unknown): string {
	if (v === null) return "null";
	if (Array.isArray(v)) return "array";
	return typeof v;
}

function expectDoctorShape(d: Record<string, unknown>): void {
	expect(["ok", "stale", "down"]).toContain(d.daemon);
	expect(["string", "null"]).toContain(kind(d.lastPollAt));
	expect(["string", "null"]).toContain(kind(d.lastDistillAt));
	expect(kind(d.dbSizeMb)).toBe("number");
	expect(kind(d.vaultPath)).toBe("string");
	expect(kind(d.configValid)).toBe("boolean");
	expect(kind(d.version)).toBe("string");
	const ollama = d.ollama as Record<string, unknown>;
	expect(kind(ollama.reachable)).toBe("boolean");
	expect(["string", "null"]).toContain(kind(ollama.model));
	if (ollama.reachable === false) expect(ollama.model).toBeNull();
}

describe("vir doctor --json contract (fixture: doctor-ollama-down.json)", () => {
	const d = load("doctor-ollama-down.json") as Record<string, unknown>;

	it("matches VirDoctorResult + VirOllamaStatus", () => {
		expectDoctorShape(d);
	});

	it("pins the unreachable state", () => {
		expect(d.ollama).toEqual({ reachable: false, model: null });
	});
});

// Since vir-cli 0.14.0 `model` is an embed-probe result, so reachable-but-null
// is a legal wire state (Ollama up, embed model deleted/broken). This fixture
// exists so no render site ever again infers reachability from `model`.
describe("vir doctor --json contract (fixture: doctor-ollama-probe-failed.json)", () => {
	const d = load("doctor-ollama-probe-failed.json") as Record<string, unknown>;

	it("matches VirDoctorResult + VirOllamaStatus", () => {
		expectDoctorShape(d);
	});

	it("pins the reachable-but-probe-failed state", () => {
		expect(d.ollama).toEqual({ reachable: true, model: null });
	});
});

describe("vir query --json contract (fixture: query.json)", () => {
	const hits = load("query.json") as Record<string, unknown>[];

	it("is a non-empty array (a trivial fixture proves nothing)", () => {
		expect(Array.isArray(hits)).toBe(true);
		expect(hits.length).toBeGreaterThan(0);
	});

	it("every hit matches VirQueryResult", () => {
		for (const h of hits) {
			expect(kind(h.path)).toBe("string");
			expect(kind(h.score)).toBe("number");
			expect(VIR_CATEGORIES).toContain(h.category);
			expect(kind(h.confidence)).toBe("number");
			expect(kind(h.preview)).toBe("string");
			expect(["string", "undefined"]).toContain(kind(h.project));
			expect(["string", "undefined"]).toContain(kind(h.date));
		}
	});
});
