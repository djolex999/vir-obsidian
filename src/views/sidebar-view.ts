import { ItemView, WorkspaceLeaf } from "obsidian";
import type VirPlugin from "../main";
import { RecentTab } from "./recent-tab";
import { RelatedTab } from "./related-tab";

export const VIR_VIEW_TYPE = "vir-sidebar";

type TabId = "recent" | "related";

export class VirSidebarView extends ItemView {
	private recentTab: RecentTab;
	private relatedTab: RelatedTab;
	private activeTab: TabId = "recent";

	private tabButtons: Record<TabId, HTMLElement> = {} as Record<TabId, HTMLElement>;
	private recentContainer!: HTMLElement;
	private relatedContainer!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: VirPlugin,
	) {
		super(leaf);
		this.recentTab = new RecentTab(this.app, this.plugin);
		this.relatedTab = new RelatedTab(this.app, this.plugin, this);
	}

	getViewType(): string {
		return VIR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return "Vir";
	}
	getIcon(): string {
		return "brain-circuit";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("vir-view");

		const tabs = root.createDiv({ cls: "vir-tabs" });
		this.tabButtons.recent = this.makeTab(tabs, "recent", "Recent");
		this.tabButtons.related = this.makeTab(tabs, "related", "Related");

		this.recentContainer = root.createDiv({ cls: "vir-content" });
		this.relatedContainer = root.createDiv({ cls: "vir-content" });

		this.relatedTab.mount(this.relatedContainer);
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
		this.tabButtons.recent.toggleClass("is-active", id === "recent");
		this.tabButtons.related.toggleClass("is-active", id === "related");
		this.recentContainer.toggle(id === "recent");
		this.relatedContainer.toggle(id === "related");
		if (id === "recent") this.recentTab.render(this.recentContainer);
	}

	/** Used by the "Surface related notes" command. */
	focusRelatedAndRefresh(): void {
		this.show("related");
		this.relatedTab.forceRefresh();
	}
}
