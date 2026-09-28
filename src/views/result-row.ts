import { setTooltip } from "obsidian";
import { categoryColor, relativeTime, verdictColor } from "../lib/format";

export interface RowData {
	title: string;
	category: string;
	project?: string;
	date?: string;
	score?: number;
	verified?: boolean;
	dimmed?: boolean;
	verdict?: string;
	reason?: string;
	onClick: () => void;
}

export function renderResultRow(parent: HTMLElement, data: RowData): void {
	const row = parent.createDiv({ cls: data.dimmed ? "vir-row is-low" : "vir-row" });
	if (typeof data.score === "number") {
		setTooltip(row, `score ${data.score.toFixed(3)}`);
	}
	row.createDiv({ cls: "vir-row-title", text: data.title });

	const meta = row.createDiv({ cls: "vir-row-meta" });
	const badge = meta.createSpan({ cls: "vir-badge", text: data.category });
	badge.style.backgroundColor = categoryColor(data.category);
	if (data.verified) {
		const mark = meta.createSpan({ cls: "vir-verified", text: "✓" });
		setTooltip(mark, "Verified in vir review");
	}
	if (data.verdict) {
		const v = meta.createSpan({ cls: "vir-badge", text: data.verdict });
		v.style.backgroundColor = verdictColor(data.verdict);
	}
	if (data.project) meta.createSpan({ text: data.project });
	if (data.date) meta.createSpan({ text: relativeTime(data.date) });
	if (data.reason) row.createDiv({ cls: "vir-row-reason", text: data.reason });

	row.addEventListener("click", data.onClick);
}

export interface EmptyStateAction {
	label: string;
	onClick: () => void;
}

export function renderEmptyState(
	parent: HTMLElement,
	message: string,
	action?: EmptyStateAction,
): void {
	const wrap = parent.createDiv({ cls: "vir-empty" });
	wrap.createDiv({ text: message });
	if (action) {
		const link = wrap.createEl("a", { text: action.label });
		link.addEventListener("click", action.onClick);
	}
}
