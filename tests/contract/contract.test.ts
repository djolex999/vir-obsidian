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
			// CLI json.ts: project is string|null (null, not absent, when unknown);
			// date is always a string, "" when the note has none.
			expect(["string", "null"]).toContain(kind(h.project));
			expect(kind(h.date)).toBe("string");
		}
	});
});

describe("vir review --json contract (fixtures: review-*.json, vir-cli 0.23.0)", () => {
	it("queue matches VirReviewQueue", () => {
		const q = load("review-queue.json") as { items: Record<string, unknown>[]; counts: Record<string, unknown> };
		expect(kind(q.counts.unaudited)).toBe("number");
		expect(kind(q.counts.stale)).toBe("number");
		expect(q.items.length).toBeGreaterThan(0);
		for (const i of q.items) {
			expect(kind(i.path)).toBe("string");
			expect(kind(i.sessionId)).toBe("string");
			expect(kind(i.title)).toBe("string");
			expect(VIR_CATEGORIES).toContain(i.category);
			expect(["string", "null"]).toContain(kind(i.project));
			expect(kind(i.date)).toBe("string");
			expect(kind(i.confidence)).toBe("number");
			expect(["reject", "merge", "verify"]).toContain(i.verdict);
			expect(kind(i.reason)).toBe("string");
			expect(kind(i.auditedAt)).toBe("string");
			if (i.mergeInto !== null) {
				const m = i.mergeInto as Record<string, unknown>;
				expect(kind(m.sessionId)).toBe("string");
				expect(["string", "null"]).toContain(kind(m.path));
				expect(["string", "null"]).toContain(kind(m.title));
			}
		}
	});

	it("action results match VirReviewActionResult", () => {
		for (const [file, action] of [
			["review-approve.json", "approve"],
			["review-reject.json", "reject"],
			["review-restore.json", "restore"],
		] as const) {
			const r = load(file) as Record<string, unknown>;
			expect(r.action).toBe(action);
			expect(kind(r.path)).toBe("string");
			expect(kind(r.sessionId)).toBe("string");
		}
		expect((load("review-reject.json") as { path: string }).path.startsWith(".rejected/")).toBe(true);
	});

	it("busy is a VirErrorPayload with kind busy", () => {
		expect(load("review-busy.json")).toMatchObject({ kind: "busy" });
	});
});
