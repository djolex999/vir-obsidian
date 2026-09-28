import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIR_ICON_ID } from "../icon";
import type VirPlugin from "../main";
import { RecentTab } from "./recent-tab";
import { RelatedTab } from "./related-tab";
import { ReviewTab } from "./review-tab";
import { ActiveNoteCard } from "./active-note-card";

export const VIR_VIEW_TYPE = "vir-sidebar";

type TabId = "recent" | "related" | "review";
const TAB_IDS: readonly TabId[] = ["recent", "related", "review"];

export class VirSidebarView extends ItemView {
	private recentTab: RecentTab;
	private relatedTab: RelatedTab;
	private reviewTab: ReviewTab;
	private card: ActiveNoteCard;
	private activeTab: TabId = "recent";

	private tabButtons = {} as Record<TabId, HTMLElement>;
	private containers = {} as Record<TabId, HTMLElement>;
	private cardContainer!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: VirPlugin,
	) {
		super(leaf);
		this.recentTab = new RecentTab(this.app, this.plugin);
		this.relatedTab = new RelatedTab(this.app, this.plugin, this);
		this.reviewTab = new ReviewTab(this.app, this.plugin);
		this.card = new ActiveNoteCard(this.app, this.plugin);
	}

	getViewType(): string {
		return VIR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return "Vir";
	}
	getIcon(): string {
		return VIR_ICON_ID;
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("vir-view");

		const tabs = root.createDiv({ cls: "vir-tabs" });
		this.tabButtons.recent = this.makeTab(tabs, "recent", "Recent");
		this.tabButtons.related = this.makeTab(tabs, "related", "Related");
		this.tabButtons.review = this.makeTab(tabs, "review", "Review");

		this.cardContainer = root.createDiv({ cls: "vir-card-slot" });
		for (const id of TAB_IDS) this.containers[id] = root.createDiv({ cls: "vir-content" });

		this.relatedTab.mount(this.containers.related);
		this.register(this.plugin.reviewStore.onChange(() => this.onReviewChange()));
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.renderCard()));
		this.registerEvent(this.app.metadataCache.on("changed", () => this.renderCard()));
		this.show(this.activeTab);
	}

	async onClose(): Promise<void> {
		this.relatedTab.unmount();
	}

	private makeTab(parent: HTMLElement, id: TabId, label: string): HTMLElement {
		const btn = parent.createEl("button", { cls: "vir-tab", text: label });
		this.registerDomEvent(btn, "click", () => this.show(id));
		return btn;
	}

	private show(id: TabId): void {
		this.activeTab = id;
		for (const t of TAB_IDS) {
			this.tabButtons[t].toggleClass("is-active", t === id);
			this.containers[t].toggle(t === id);
		}
		if (id === "recent") this.recentTab.render(this.containers.recent);
		if (id === "review") void this.reviewTab.render(this.containers.review);
		this.renderCard();
	}

	private onReviewChange(): void {
		if (this.activeTab === "review") void this.reviewTab.render(this.containers.review);
		this.renderCard();
	}

	private renderCard(): void {
		if (this.activeTab === "recent") {
			this.cardContainer.empty();
			this.cardContainer.hide();
			return;
		}
		void this.plugin.ensureReviewSupport().then((s) => {
			if (s === "supported") this.card.render(this.cardContainer);
			else this.cardContainer.hide();
		});
	}

	/** Used by the "Surface related notes" command. */
	focusRelatedAndRefresh(): void {
		this.show("related");
		this.relatedTab.forceRefresh();
	}
}
