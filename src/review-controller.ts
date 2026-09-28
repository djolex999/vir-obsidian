import { App, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type { ReviewStore } from "./review-store";
import { isReviewablePath, nextItem } from "./lib/review-queue";

const UNDO_MS = 8_000;

export class ReviewController {
	constructor(
		private readonly app: App,
		private readonly store: ReviewStore,
	) {}

	/** A vir session note: <category-dir>/<name>.md with a session_id. */
	isReviewable(file: TFile | null): file is TFile {
		if (!file || !isReviewablePath(file.path)) return false;
		const sid: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.["session_id"];
		return typeof sid === "string" && sid.length > 0;
	}

	approve(file: TFile): Promise<void> {
		return this.act("approve", file);
	}

	reject(file: TFile): Promise<void> {
		return this.act("reject", file);
	}

	async openNext(): Promise<void> {
		if (this.store.snapshot.fetchedAt === null) await this.store.refresh();
		const activePath = this.app.workspace.getActiveFile()?.path;
		const first = this.store.snapshot.items.find((i) => i.path !== activePath);
		if (first) await this.openPath(first.path);
		else new Notice("Vir: nothing left to review");
	}

	async openPath(path: string, leaf?: WorkspaceLeaf): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await (leaf ?? this.app.workspace.getLeaf(false)).openFile(file);
	}

	private async act(action: "approve" | "reject", file: TFile): Promise<void> {
		const leaf = this.leafShowing(file);
		// Obsidian saves the editor buffer on a delay. If it saves after the CLI
		// writes `verified: true`, the stamp is silently overwritten. Flush first.
		try {
			for (const l of this.app.workspace.getLeavesOfType("markdown")) {
				if (l.view instanceof MarkdownView && l.view.file?.path === file.path) await l.view.save();
			}
		} catch {
			new Notice("Vir: couldn't save the note before acting; nothing was changed.");
			return;
		}
		const title = this.store.snapshot.items.find((i) => i.path === file.path)?.title ?? file.basename;
		const outcome = await this.store.act(action, file.path);
		if (!outcome.ok) {
			if (outcome.reason !== "in_flight") new Notice(`Vir: ${outcome.message}`);
			return;
		}
		// An approve of a note that wasn't queued keeps you on it; a reject moves the file away.
		if (outcome.index >= 0 || action === "reject") {
			const next = nextItem(this.store.snapshot.items, Math.max(outcome.index, 0));
			if (next) await this.openPath(next.path, leaf ?? undefined);
		}
		if (action === "reject") this.offerUndo(title, outcome.removed, outcome.index, outcome.result.path);
	}

	private offerUndo(
		title: string,
		removed: Parameters<ReviewStore["undoReject"]>[0],
		index: number,
		rejectedPath: string,
	): void {
		let notice: Notice | null = null;
		let started = false;
		const runUndo = (): void => {
			if (started) return;
			started = true;
			notice?.hide();
			void this.store.undoReject(removed, index, rejectedPath).then(async (undo) => {
				if (!undo.ok) {
					if (undo.message) new Notice(`Vir: ${undo.message}`);
					if (undo.reason === "busy" || undo.reason === "timeout") {
						this.offerUndo(title, removed, index, rejectedPath);
					}
					return;
				}
				await this.openPath(undo.result.path);
			});
		};
		const frag = createFragment((f) => {
			const wrap = f.createSpan({ cls: "vir-undo-notice" });
			wrap.style.cursor = "pointer";
			wrap.appendText(`Rejected ${title} · `);
			wrap.createEl("a", { text: "Undo", href: "#" });
			wrap.addEventListener("click", (evt) => {
				evt.preventDefault();
				runUndo();
			});
		});
		notice = new Notice(frag, UNDO_MS);
	}

	private leafShowing(file: TFile): WorkspaceLeaf | null {
		return (
			this.app.workspace
				.getLeavesOfType("markdown")
				.find((l) => l.view instanceof MarkdownView && l.view.file?.path === file.path) ?? null
		);
	}
}
