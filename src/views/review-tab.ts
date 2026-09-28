import type { App } from "obsidian";
import type VirPlugin from "../main";
import { relativeTime } from "../lib/format";
import { openPluginSettings } from "../lib/app-setting";
import { REVIEW_MIN_CLI } from "../lib/review-queue";
import { renderEmptyState, renderResultRow } from "./result-row";

export class ReviewTab {
	constructor(
		private readonly app: App,
		private readonly plugin: VirPlugin,
	) {}

	async render(container: HTMLElement): Promise<void> {
		const support = await this.plugin.ensureReviewSupport();
		container.empty();
		if (support === "unsupported") {
			renderEmptyState(container, `Update vir to ${REVIEW_MIN_CLI} or later to review from Obsidian`);
			return;
		}

		const store = this.plugin.reviewStore;
		const snap = store.snapshot;
		if (snap.fetchedAt === null && snap.error === null && !snap.notConfigured && !snap.inFlight) {
			container.createDiv({ cls: "vir-empty", text: "Loading review queue…" });
			void store.refresh();
			return;
		}
		if (snap.notConfigured) {
			renderEmptyState(container, "Vir CLI not configured.", {
				label: "Open settings",
				onClick: () => openPluginSettings(this.app, this.plugin.manifest.id),
			});
			return;
		}

		const header = container.createDiv({ cls: "vir-review-header" });
		const fetched = snap.fetchedAt !== null ? ` · fetched ${relativeTime(new Date(snap.fetchedAt).toISOString())}` : "";
		header.createSpan({
			text: `${snap.items.length} to review · ${snap.counts.unaudited} not audited · ${snap.counts.stale} stale${fetched}`,
		});
		const refresh = header.createEl("button", { cls: "clickable-icon", text: "↻" });
		refresh.setAttr("aria-label", "Refresh review queue");
		// Plain listeners: these elements are rebuilt on every render and the
		// old ones are dropped with container.empty(). registerDomEvent would
		// pin every discarded element to the plugin until unload.
		refresh.addEventListener("click", () => void store.refresh());

		if (snap.error !== null) {
			renderEmptyState(container, `Couldn't load the queue: ${snap.error}`);
			return;
		}
		if (snap.items.length === 0) {
			renderEmptyState(container, "Queue clear. Run `vir audit` in a terminal to judge new notes.");
			return;
		}

		for (const item of snap.items) {
			renderResultRow(container, {
				title: item.title,
				category: item.category,
				project: item.project ?? undefined,
				date: item.date,
				verdict: item.verdict,
				reason: item.reason,
				onClick: () => void this.plugin.review.openPath(item.path),
			});
		}
	}
}
