import type { App } from "obsidian";
import type VirPlugin from "../main";
import { findItem } from "../lib/review-queue";
import { verdictColor } from "../lib/format";

// The in-context half of review: whatever session note is open, show its
// verdict and the two actions. Reads the store's cache only.
export class ActiveNoteCard {
	constructor(
		private readonly app: App,
		private readonly plugin: VirPlugin,
	) {}

	render(parent: HTMLElement): void {
		parent.empty();
		const file = this.app.workspace.getActiveFile();
		if (!this.plugin.review.isReviewable(file)) {
			parent.hide();
			return;
		}
		parent.show();
		const snap = this.plugin.reviewStore.snapshot;
		if (snap.fetchedAt === null && !snap.inFlight && snap.error === null && !snap.notConfigured) {
			void this.plugin.reviewStore.refresh();
		}

		const card = parent.createDiv({ cls: "vir-card" });
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.["verified"] === true) {
			card.createDiv({ cls: "vir-card-verified", text: "✓ Verified" });
			return;
		}

		const item = findItem(snap.items, file.path);
		const head = card.createDiv({ cls: "vir-card-head" });
		if (item) {
			const badge = head.createSpan({ cls: "vir-badge", text: item.verdict });
			badge.style.backgroundColor = verdictColor(item.verdict);
			card.createDiv({ cls: "vir-card-reason", text: item.reason });
			const target = item.mergeInto;
			if (target) {
				const line = card.createDiv({ cls: "vir-card-reason" });
				line.appendText("merge into ");
				if (target.path !== null) {
					const targetPath = target.path;
					const link = line.createEl("a", { text: target.title ?? targetPath });
					link.addEventListener("click", () => void this.plugin.review.openPath(targetPath));
				} else {
					line.appendText("a note that no longer exists");
				}
			}
		} else {
			head.createSpan({ cls: "vir-card-muted", text: "Not flagged" });
		}

		const actions = card.createDiv({ cls: "vir-card-actions" });
		const approve = actions.createEl("button", { cls: "mod-cta", text: "Approve" });
		const reject = actions.createEl("button", { cls: "mod-warning", text: "Reject" });
		approve.disabled = snap.inFlight;
		reject.disabled = snap.inFlight;
		// Plain listeners: the card is rebuilt on every render (see ReviewTab).
		approve.addEventListener("click", () => void this.plugin.review.approve(file));
		reject.addEventListener("click", () => void this.plugin.review.reject(file));
	}
}
