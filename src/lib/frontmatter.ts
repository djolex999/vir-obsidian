import type { VirCategory } from "../types";

export const VIR_CATEGORIES: readonly VirCategory[] = [
	"pattern",
	"gotcha",
	"decision",
	"tool",
	"article",
	"topic",
];

export function isVirCategory(value: unknown): value is VirCategory {
	return typeof value === "string" && (VIR_CATEGORIES as readonly string[]).includes(value);
}

export interface VirNoteMeta {
	category: VirCategory;
	project?: string;
	date?: string;
}

export function extractVirMeta(
	fm: Record<string, unknown> | null | undefined,
): VirNoteMeta | null {
	if (!fm) return null;
	// Topic notes (`vir compose`) carry `type: topic` and NO `category` field
	// (and no project/date) — every other vir note has an explicit `category`.
	// Map the type so the Recent scan surfaces topics alongside sessions.
	const category = fm["type"] === "topic" ? "topic" : fm["category"];
	if (!isVirCategory(category)) return null;
	const project = typeof fm["project"] === "string" ? fm["project"] : undefined;
	// Topics have no `date`; fall back to `updated`/`created` so they sort by
	// recency and survive the Recent tab's date-sort-then-slice like sessions.
	const date =
		typeof fm["date"] === "string"
			? fm["date"]
			: typeof fm["updated"] === "string"
				? fm["updated"]
				: typeof fm["created"] === "string"
					? fm["created"]
					: undefined;
	return { category, project, date };
}
