import { describe, it, expect } from "vitest";
import { isVirCategory, extractVirMeta } from "../src/lib/frontmatter";

describe("isVirCategory", () => {
	it("accepts known categories", () => {
		expect(isVirCategory("gotcha")).toBe(true);
		expect(isVirCategory("article")).toBe(true);
	});
	it("rejects unknown / non-strings", () => {
		expect(isVirCategory("note")).toBe(false);
		expect(isVirCategory(42)).toBe(false);
		expect(isVirCategory(undefined)).toBe(false);
	});
	it("accepts 'topic' (the compose-loop category)", () => {
		expect(isVirCategory("topic")).toBe(true);
	});
});

describe("extractVirMeta", () => {
	it("returns null when frontmatter is missing or has no vir category", () => {
		expect(extractVirMeta(null)).toBeNull();
		expect(extractVirMeta(undefined)).toBeNull();
		expect(extractVirMeta({ title: "x" })).toBeNull();
		expect(extractVirMeta({ category: "journal" })).toBeNull();
	});
	it("extracts category with optional project/date", () => {
		expect(
			extractVirMeta({ category: "decision", project: "vir", date: "2026-05-01T00:00:00.000Z" }),
		).toEqual({ category: "decision", project: "vir", date: "2026-05-01T00:00:00.000Z" });
	});
	it("omits non-string project/date", () => {
		expect(extractVirMeta({ category: "tool", project: 5, date: true })).toEqual({
			category: "tool",
			project: undefined,
			date: undefined,
		});
	});
	it("recognizes a topic note by `type: topic` (it carries no `category` field)", () => {
		const meta = extractVirMeta({
			type: "topic",
			title: "Auth Flow Patterns",
			updated: "2026-05-28",
			created: "2026-05-20",
		});
		expect(meta).not.toBeNull();
		expect(meta?.category).toBe("topic");
		// Topics have no `date`; fall back to `updated` so Recent sorts (and keeps) them.
		expect(meta?.date).toBe("2026-05-28");
	});
	it("falls back to `created` for a topic without `updated`", () => {
		expect(extractVirMeta({ type: "topic", created: "2026-05-20" })?.date).toBe(
			"2026-05-20",
		);
	});
});
