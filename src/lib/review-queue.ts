import type { VirReviewItem } from "../types";

export const REVIEW_MIN_CLI = "0.23.0";

// The CLI's reviewable dirs (vir-cli CATEGORY_DIR). Topics, articles and pdfs
// carry no session and are never reviewed; archived/ holds dedupe losers.
const REVIEWABLE_DIRS = new Set(["patterns", "gotchas", "decisions", "tools"]);

export function isAtLeast(version: string, min: string): boolean {
	const parse = (v: string): number[] | null => {
		const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
		return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
	};
	const a = parse(version);
	const b = parse(min);
	if (!a || !b) return false;
	for (let i = 0; i < 3; i++) {
		if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
	}
	return true;
}

export function isReviewablePath(path: string): boolean {
	const parts = path.split("/");
	return parts.length === 2 && REVIEWABLE_DIRS.has(parts[0] ?? "") && (parts[1] ?? "").endsWith(".md");
}

export function rejectedName(path: string): string {
	return path.split("/").pop() ?? path;
}

export function findItem(items: VirReviewItem[], path: string): VirReviewItem | undefined {
	return items.find((i) => i.path === path);
}

export function removeItem(
	items: VirReviewItem[],
	path: string,
): { items: VirReviewItem[]; removed: VirReviewItem | null; index: number } {
	const index = items.findIndex((i) => i.path === path);
	if (index < 0) return { items, removed: null, index: -1 };
	return {
		items: [...items.slice(0, index), ...items.slice(index + 1)],
		removed: items[index] ?? null,
		index,
	};
}

export function insertItem(items: VirReviewItem[], item: VirReviewItem, index: number): VirReviewItem[] {
	if (items.some((i) => i.path === item.path)) return items;
	const at = Math.max(0, Math.min(index, items.length));
	return [...items.slice(0, at), item, ...items.slice(at)];
}

// After removing the item at `index`, the next one to review is whatever now
// sits there; past the end, start again from the top of the queue.
export function nextItem(items: VirReviewItem[], index: number): VirReviewItem | undefined {
	return items[index] ?? items[0];
}
