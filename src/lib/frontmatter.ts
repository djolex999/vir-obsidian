import type { VirCategory } from "../types";

export const VIR_CATEGORIES: readonly VirCategory[] = [
	"pattern",
	"gotcha",
	"decision",
	"tool",
	"article",
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
	const category = fm["category"];
	if (!isVirCategory(category)) return null;
	const project = typeof fm["project"] === "string" ? fm["project"] : undefined;
	const date = typeof fm["date"] === "string" ? fm["date"] : undefined;
	return { category, project, date };
}
