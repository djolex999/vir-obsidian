import { App, TFile } from "obsidian";
import type VirPlugin from "../main";
import { extractVirMeta, isArchivedPath, isLowConfidence } from "../lib/frontmatter";
import { renderResultRow, renderEmptyState } from "./result-row";

interface RecentRow {
	file: TFile;
	category: string;
	project?: string;
	date?: string;
	title?: string;
	verified: boolean;
	dimmed: boolean;
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

		for (const { file, date, category, project, title, verified, dimmed } of notes) {
			renderResultRow(container, {
				// Real title from frontmatter (source_title/title/topic); the basename
				// slug is the fallback for notes without one.
				title: title ?? file.basename,
				category,
				project,
				date,
				verified,
				dimmed,
				onClick: () => void this.app.workspace.getLeaf(false).openFile(file),
			});
		}
	}

	private collect(): RecentRow[] {
		const rows: RecentRow[] = [];
		const { minConfidence } = this.plugin.settings;
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (isArchivedPath(file.path)) continue;
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			const meta = extractVirMeta(fm);
			if (!meta) continue;
			rows.push({
				file,
				category: meta.category,
				project: meta.project,
				date: meta.date,
				title: meta.title,
				verified: meta.verified,
				dimmed: isLowConfidence(meta, minConfidence),
			});
		}
		rows.sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
		return rows.slice(0, this.plugin.settings.recentCount);
	}
}
