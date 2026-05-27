import { App, Modal, TFile } from "obsidian";
import type VirPlugin from "../main";
import type { VirQueryResult } from "../types";
import { VirNotFoundError } from "../vir-client";
import { renderResultRow, renderEmptyState } from "../views/result-row";

export class VirSearchModal extends Modal {
	private resultsEl!: HTMLElement;

	constructor(
		app: App,
		private plugin: VirPlugin,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "Vir: Search vault" });

		const input = contentEl.createEl("input", {
			cls: "vir-search-input",
			attr: { type: "text", placeholder: "Ask your distilled knowledge…" },
		});
		this.resultsEl = contentEl.createDiv({ cls: "vir-search-results" });

		// Modal is not a Component, so use a plain listener; it dies with contentEl on close.
		input.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				void this.runSearch(input.value.trim());
			}
		});
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async runSearch(text: string): Promise<void> {
		if (!text) return;
		this.resultsEl.empty();
		this.resultsEl.createDiv({ cls: "vir-empty", text: "Searching…" });

		let results: VirQueryResult[];
		try {
			results = await this.plugin.client.query(text, this.plugin.settings.relatedLimit);
		} catch (err) {
			this.resultsEl.empty();
			const message =
				err instanceof VirNotFoundError
					? "Vir CLI not configured."
					: `Vir error: ${err instanceof Error ? err.message : String(err)}`;
			renderEmptyState(this.resultsEl, message);
			return;
		}

		this.resultsEl.empty();
		if (results.length === 0) {
			renderEmptyState(this.resultsEl, "No results.");
			return;
		}

		// Preserve vir's MMR order — no client-side re-sort.
		for (const r of results) {
			renderResultRow(this.resultsEl, {
				title: r.path.split("/").pop()?.replace(/\.md$/i, "") ?? r.path,
				category: r.category,
				project: r.project,
				date: r.date,
				score: r.score,
				onClick: () => {
					const file = this.app.vault.getAbstractFileByPath(r.path);
					if (file instanceof TFile) {
						void this.app.workspace.getLeaf(false).openFile(file);
						this.close();
					}
				},
			});
		}
	}
}
