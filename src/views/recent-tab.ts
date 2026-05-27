import { App, TFile } from "obsidian";
import type VirPlugin from "../main";
import { extractVirMeta } from "../lib/frontmatter";
import { renderResultRow, renderEmptyState } from "./result-row";

interface RecentRow {
	file: TFile;
	category: string;
	project?: string;
	date?: string;
}

export class RecentTab {
	constructor(
		private app: App,
		private plugin: VirPlugin,
	) {}

	render(container: HTMLElement): void {
		container.empty();

		const notes = this.collect();
		if (notes.length === 0) {
			renderEmptyState(container, "No vir-distilled notes found in this vault yet.");
			return;
		}

		for (const { file, date, category, project } of notes) {
			renderResultRow(container, {
				title: file.basename,
				category,
				project,
				date,
				onClick: () => void this.app.workspace.getLeaf(false).openFile(file),
			});
		}
	}

	private collect(): RecentRow[] {
		const rows: RecentRow[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			const meta = extractVirMeta(fm);
			if (!meta) continue;
			rows.push({ file, category: meta.category, project: meta.project, date: meta.date });
		}
		rows.sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
		return rows.slice(0, this.plugin.settings.recentCount);
	}
}
