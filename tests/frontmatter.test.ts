import { describe, it, expect } from "vitest";
import {
	isVirCategory,
	extractVirMeta,
	titleFromFrontmatter,
} from "../src/lib/frontmatter";

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
	it("accepts 'pdf' (the PDF-ingestion category)", () => {
		expect(isVirCategory("pdf")).toBe(true);
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
	it("recognizes a pdf note by `type: pdf` (its `category` is the sub-taxonomy)", () => {
		const meta = extractVirMeta({
			type: "pdf",
			category: "paper", // sub-taxonomy, NOT a wire category
			source_title: "Vibe-driven model-based engineering",
			distilled_at: "2026-06-26T10:34:24.078Z",
		});
		expect(meta).not.toBeNull();
		expect(meta?.category).toBe("pdf");
		// PDFs have no `date`/`updated`/`created` — fall back to `distilled_at` so
		// they sort (and survive the Recent slice) instead of sinking to epoch 0.
		expect(meta?.date).toBe("2026-06-26T10:34:24.078Z");
		expect(meta?.title).toBe("Vibe-driven model-based engineering");
	});
	it("recognizes an article note by `type: article` (the latent twin of the pdf bug)", () => {
		const meta = extractVirMeta({
			type: "article",
			category: "concept", // sub-taxonomy, NOT a wire category
			source_title: "The Compounding Codebase",
			distilled_at: "2026-05-22T00:00:00.000Z",
		});
		expect(meta?.category).toBe("article");
		expect(meta?.date).toBe("2026-05-22T00:00:00.000Z");
		expect(meta?.title).toBe("The Compounding Codebase");
	});
	it("surfaces a session note's `topic` as its title", () => {
		expect(
			extractVirMeta({ category: "gotcha", topic: "kie 200 body error" })?.title,
		).toBe("kie 200 body error");
	});
});

describe("titleFromFrontmatter", () => {
	it("prefers source_title (pdf/article)", () => {
		expect(titleFromFrontmatter({ source_title: "A Paper", title: "x" })).toBe("A Paper");
	});
	it("uses title for topics", () => {
		expect(titleFromFrontmatter({ type: "topic", title: "Auth Flow" })).toBe("Auth Flow");
	});
	it("uses topic for sessions", () => {
		expect(titleFromFrontmatter({ category: "gotcha", topic: "some lesson" })).toBe(
			"some lesson",
		);
	});
	it("returns undefined when no title-ish field is present or non-string", () => {
		expect(titleFromFrontmatter({ category: "tool" })).toBeUndefined();
		expect(titleFromFrontmatter({ source_title: 5 })).toBeUndefined();
		expect(titleFromFrontmatter(null)).toBeUndefined();
	});
});
