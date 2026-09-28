import { App, Debouncer, debounce, TFile, ItemView } from "obsidian";
import type VirPlugin from "../main";
import type { VirQueryResult } from "../types";
import { VirNotFoundError } from "../vir-client";
import { buildQueryText } from "../lib/query-text";
import { titleFromFrontmatter } from "../lib/frontmatter";
import { renderResultRow, renderEmptyState } from "./result-row";
import { openPluginSettings } from "../lib/app-setting";

export class RelatedTab {
	private container: HTMLElement | null = null;
	private debouncedRefresh: Debouncer<[], void>;

	constructor(
		private app: App,
		private plugin: VirPlugin,
		private view: ItemView,
	) {
		this.debouncedRefresh = debounce(() => void this.refresh(), 500, false);
	}

	/** Called by the view once, when the Related tab's container is created. */
	mount(container: HTMLElement): void {
		this.container = container;
		this.view.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.plugin.settings.autoSurface) this.debouncedRefresh();
			}),
		);
		void this.refresh();
	}

	unmount(): void {
		this.debouncedRefresh.cancel();
		this.container = null;
	}

	/** Force an immediate refresh (used by the "Surface related notes" command). */
	forceRefresh(): void {
		void this.refresh();
	}

	private async refresh(): Promise<void> {
		const container = this.container;
		if (!container) return;
		container.empty();

		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			renderEmptyState(
				container,
				"No active note. Open a markdown note to see related distilled knowledge.",
			);
			return;
		}

		const loading = container.createDiv({ cls: "vir-empty", text: "Searching…" });

		let results: VirQueryResult[];
		try {
			const body = await this.app.vault.cachedRead(file);
			const text = buildQueryText(file.basename, body);
			results = await this.plugin.client.query(text, this.plugin.settings.relatedLimit);
		} catch (err) {
			container.empty();
			if (err instanceof VirNotFoundError) {
				renderEmptyState(container, "Vir CLI not configured.", {
					label: "Open settings",
					onClick: () => openPluginSettings(this.app, this.plugin.manifest.id),
				});
			} else {
				renderEmptyState(
					container,
					"Vir daemon unreachable. Check that the daemon is running.",
				);
			}
			return;
		}

		loading.remove();

		// Preserve vir's MMR order. Filter by confidence (NOT score) and drop the active file.
		const filtered = results.filter(
			(r) => r.path !== file.path && r.confidence >= this.plugin.settings.minConfidence,
		);

		if (filtered.length === 0) {
			renderEmptyState(container, "No related notes found.");
			return;
		}

		for (const r of filtered) {
			const { title, verified } = this.metaForPath(r.path);
			renderResultRow(container, {
				title,
				category: r.category,
				project: r.project ?? undefined,
				date: r.date,
				verified,
				score: r.score,
				onClick: () => this.openByPath(r.path),
			});
		}
	}

	// The wire result carries no title, so read the note's real title
	// (source_title/title/topic) from frontmatter; the basename slug is the
	// fallback for notes outside the vault or without a title field.
	private metaForPath(path: string): { title: string; verified: boolean } {
		const file = this.app.vault.getAbstractFileByPath(path);
		const fm =
			file instanceof TFile ? this.app.metadataCache.getFileCache(file)?.frontmatter : undefined;
		return {
			title: titleFromFrontmatter(fm) ?? titleFromPath(path),
			verified: fm?.["verified"] === true,
		};
	}

	private openByPath(path: string): void {
		const target = this.app.vault.getAbstractFileByPath(path);
		if (target instanceof TFile) {
			void this.app.workspace.getLeaf(false).openFile(target);
		}
	}
}

function titleFromPath(path: string): string {
	const base = path.split("/").pop() ?? path;
	return base.replace(/\.md$/i, "");
}
