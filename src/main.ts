import { Plugin, Platform, WorkspaceLeaf, ItemView } from "obsidian";
import { VirSettings, DEFAULT_SETTINGS, VirSettingTab } from "./settings";
import { VirClient, detectVirBinary } from "./vir-client";
import { VirStatusBar } from "./status-bar";
import { VIR_VIEW_TYPE, VirSidebarView } from "./views/sidebar-view";
import { VirSearchModal } from "./modals/search-modal";
import { openPluginSettings } from "./lib/app-setting";

export default class VirPlugin extends Plugin {
	settings!: VirSettings;
	client!: VirClient;
	private statusBar: VirStatusBar | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		if (Platform.isMobile) {
			this.registerMobilePlaceholder();
			return;
		}

		this.client = new VirClient(this.settings.binaryPath);

		// Best-effort one-time auto-detect if the path is still the bare default.
		if (this.settings.binaryPath === "vir") {
			void detectVirBinary().then((found) => {
				if (found) {
					this.settings.binaryPath = found;
					void this.saveSettings();
					this.refreshClient();
				}
			});
		}

		this.registerView(VIR_VIEW_TYPE, (leaf) => new VirSidebarView(leaf, this));

		this.addRibbonIcon("brain-circuit", "Vir: open sidebar", () => void this.activateView());

		this.statusBar = new VirStatusBar(this);
		this.statusBar.start();

		this.addSettingTab(new VirSettingTab(this.app, this));

		this.addCommand({
			id: "search-vault",
			name: "Search vault",
			callback: () => new VirSearchModal(this.app, this).open(),
		});
		this.addCommand({
			id: "surface-related-notes",
			name: "Surface related notes",
			callback: () => void this.surfaceRelated(),
		});
		this.addCommand({
			id: "open-settings",
			name: "Open settings",
			callback: () => this.openSettings(),
		});
	}

	private registerMobilePlaceholder(): void {
		this.registerView(VIR_VIEW_TYPE, (leaf) => new MobilePlaceholderView(leaf));
		this.addRibbonIcon("brain-circuit", "Vir", () => void this.activateView());
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshClient(): void {
		this.client = new VirClient(this.settings.binaryPath);
	}

	restartStatusPolling(): void {
		this.statusBar?.restart();
	}

	openSettings(): void {
		openPluginSettings(this.app, this.manifest.id);
	}

	private async activateView(): Promise<WorkspaceLeaf | null> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIR_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (leaf) await leaf.setViewState({ type: VIR_VIEW_TYPE, active: true });
		}
		if (leaf) workspace.revealLeaf(leaf);
		return leaf;
	}

	private async surfaceRelated(): Promise<void> {
		const leaf = await this.activateView();
		const view = leaf?.view;
		if (view instanceof VirSidebarView) view.focusRelatedAndRefresh();
	}
}

class MobilePlaceholderView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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
		this.contentEl.empty();
		this.contentEl.createDiv({
			cls: "vir-empty",
			text: "Vir is desktop-only — it relies on the vir CLI, which is not available on mobile.",
		});
	}
}
