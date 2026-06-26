import type { VirCategory } from "../types";

export const VIR_CATEGORIES: readonly VirCategory[] = [
	"pattern",
	"gotcha",
	"decision",
	"tool",
	"article",
	"topic",
	"pdf",
];

export function isVirCategory(value: unknown): value is VirCategory {
	return typeof value === "string" && (VIR_CATEGORIES as readonly string[]).includes(value);
}

export interface VirNoteMeta {
	category: VirCategory;
	project?: string;
	date?: string;
	title?: string;
}

// The note's display title. Sessions carry `topic`; topics carry `title`;
// articles/pdfs carry `source_title` (NOT a `title:` key). The wire contract
// has no title field, so both panes read this from frontmatter — the basename
// slug (`vibe-driven-…-a53874e0`) is the fallback, not the title.
export function titleFromFrontmatter(
	fm: Record<string, unknown> | null | undefined,
): string | undefined {
	if (!fm) return undefined;
	for (const key of ["source_title", "title", "topic"]) {
		const v = fm[key];
		if (typeof v === "string" && v.trim().length > 0) return v.trim();
	}
	return undefined;
}

export function extractVirMeta(
	fm: Record<string, unknown> | null | undefined,
): VirNoteMeta | null {
	if (!fm) return null;
	// The source-typed notes (topic/article/pdf) classify by `type`, not
	// `category`: topics carry NO `category`, while articles/pdfs carry a
	// SUB-taxonomy there (concept/…, paper/…) that isn't a wire category. Mirror
	// the CLI's `categoryOf` so the Recent scan surfaces them like sessions —
	// without this, a pdf's `category: paper` fails isVirCategory and the note is
	// dropped from Recent entirely (and articles had the same latent bug).
	const type = fm["type"];
	const category =
		type === "topic" || type === "article" || type === "pdf" ? type : fm["category"];
	if (!isVirCategory(category)) return null;
	const project = typeof fm["project"] === "string" ? fm["project"] : undefined;
	// Sessions have `date`; topics fall back to `updated`/`created`; articles/pdfs
	// have only `distilled_at`. Include it so dateless source notes sort by
	// recency and survive the Recent tab's date-sort-then-slice (the topic bug).
	const date =
		typeof fm["date"] === "string"
			? fm["date"]
			: typeof fm["updated"] === "string"
				? fm["updated"]
				: typeof fm["created"] === "string"
					? fm["created"]
					: typeof fm["distilled_at"] === "string"
						? fm["distilled_at"]
						: undefined;
	return { category, project, date, title: titleFromFrontmatter(fm) };
}
