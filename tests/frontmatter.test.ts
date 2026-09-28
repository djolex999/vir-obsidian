import { describe, it, expect } from "vitest";
import {
	isVirCategory,
	extractVirMeta,
	titleFromFrontmatter,
	isArchivedPath,
	isLowConfidence,
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
		).toEqual({
			category: "decision",
			project: "vir",
			date: "2026-05-01T00:00:00.000Z",
			verified: false,
		});
	});
	it("omits non-string project/date", () => {
		expect(extractVirMeta({ category: "tool", project: 5, date: true })).toEqual({
			category: "tool",
			project: undefined,
			date: undefined,
			verified: false,
		});
	});
	it("reads `verified: true` (stamped by vir review) and nothing else as verified", () => {
		expect(extractVirMeta({ category: "gotcha", verified: true })?.verified).toBe(true);
		expect(extractVirMeta({ category: "gotcha", verified: "true" })?.verified).toBe(false);
		expect(extractVirMeta({ category: "gotcha" })?.verified).toBe(false);
	});
	it("reads a numeric confidence and ignores a non-numeric one", () => {
		expect(extractVirMeta({ category: "gotcha", confidence: 0.62 })?.confidence).toBe(0.62);
		expect(extractVirMeta({ category: "gotcha", confidence: "high" })?.confidence).toBeUndefined();
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

describe("isArchivedPath", () => {
	it("matches a note vir dedupe moved into archived/", () => {
		expect(isArchivedPath("archived/tailwind-specificity-ec453610.md")).toBe(true);
		expect(isArchivedPath("vir/archived/tailwind-specificity-ec453610.md")).toBe(true);
	});
	it("does not match serving notes or a filename that merely contains the word", () => {
		expect(isArchivedPath("gotchas/tailwind-specificity-ec453610.md")).toBe(false);
		expect(isArchivedPath("archived-notes.md")).toBe(false);
		expect(isArchivedPath("patterns/archived.md")).toBe(false);
	});
});

describe("isLowConfidence", () => {
	it("is true below the threshold", () => {
		expect(isLowConfidence({ confidence: 0.6, verified: false }, 0.7)).toBe(true);
	});
	it("is false at or above the threshold", () => {
		expect(isLowConfidence({ confidence: 0.7, verified: false }, 0.7)).toBe(false);
	});
	it("never dims a verified note: the human verdict outranks the model's confidence", () => {
		expect(isLowConfidence({ confidence: 0.3, verified: true }, 0.7)).toBe(false);
	});
	it("does not dim a note with no confidence (topics, articles)", () => {
		expect(isLowConfidence({ verified: false }, 0.7)).toBe(false);
	});
});
