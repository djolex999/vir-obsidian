import { setTooltip } from "obsidian";
import { categoryColor, relativeTime } from "../lib/format";

export interface RowData {
	title: string;
	category: string;
	project?: string;
	date?: string;
	score?: number;
	onClick: () => void;
}

export function renderResultRow(parent: HTMLElement, data: RowData): void {
	const row = parent.createDiv({ cls: "vir-row" });
	if (typeof data.score === "number") {
		setTooltip(row, `score ${data.score.toFixed(3)}`);
	}
	row.createDiv({ cls: "vir-row-title", text: data.title });

	const meta = row.createDiv({ cls: "vir-row-meta" });
	const badge = meta.createSpan({ cls: "vir-badge", text: data.category });
	badge.style.backgroundColor = categoryColor(data.category);
	if (data.project) meta.createSpan({ text: data.project });
	if (data.date) meta.createSpan({ text: relativeTime(data.date) });

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
