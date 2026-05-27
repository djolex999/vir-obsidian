import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type VirPlugin from "./main";
import { detectVirBinary } from "./vir-client";

export interface VirSettings {
	binaryPath: string;
	pollIntervalMs: number;
	autoSurface: boolean;
	recentCount: number;
	relatedLimit: number;
	minConfidence: number;
}

export const DEFAULT_SETTINGS: VirSettings = {
	binaryPath: "vir",
	pollIntervalMs: 30_000,
	autoSurface: true,
	recentCount: 20,
	relatedLimit: 10,
	minConfidence: 0.7,
};

export class VirSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: VirPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Vir binary path")
			.setDesc(
				"Absolute path to the vir CLI. Use Detect to resolve it via your login shell (handles nvm/asdf).",
			)
			.addText((text) =>
				text
					.setPlaceholder("vir")
					.setValue(this.plugin.settings.binaryPath)
					.onChange(async (value) => {
						this.plugin.settings.binaryPath = value.trim() || "vir";
						await this.plugin.saveSettings();
						this.plugin.refreshClient();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Detect").onClick(async () => {
					const found = await detectVirBinary();
					if (found) {
						this.plugin.settings.binaryPath = found;
						await this.plugin.saveSettings();
						this.plugin.refreshClient();
						new Notice(`Vir: found at ${found}`);
						this.display();
					} else {
						new Notice(
							"Vir: could not detect the binary. Install @djolex999/vir-cli or set the path manually.",
						);
					}
				}),
			);

		new Setting(containerEl)
			.setName("Daemon poll interval (ms)")
			.setDesc("How often the status bar polls vir doctor. Minimum 5000.")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.pollIntervalMs))
					.onChange(async (value) => {
						const n = Number(value);
						if (Number.isFinite(n) && n >= 5_000) {
							this.plugin.settings.pollIntervalMs = n;
							await this.plugin.saveSettings();
							this.plugin.restartStatusPolling();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Auto-surface related on file open")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoSurface).onChange(async (v) => {
					this.plugin.settings.autoSurface = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName("Recent items count").addText((text) =>
			text.setValue(String(this.plugin.settings.recentCount)).onChange(async (value) => {
				const n = Number(value);
				if (Number.isInteger(n) && n > 0) {
					this.plugin.settings.recentCount = n;
					await this.plugin.saveSettings();
				}
			}),
		);

		new Setting(containerEl).setName("Related items limit").addText((text) =>
			text.setValue(String(this.plugin.settings.relatedLimit)).onChange(async (value) => {
				const n = Number(value);
				if (Number.isInteger(n) && n > 0) {
					this.plugin.settings.relatedLimit = n;
					await this.plugin.saveSettings();
				}
			}),
		);

		new Setting(containerEl)
			.setName("Min confidence threshold")
			.setDesc("Hide related results below this confidence (0.0–1.0).")
			.addText((text) =>
				text
					.setValue(String(this.plugin.settings.minConfidence))
					.onChange(async (value) => {
						const n = Number(value);
						if (Number.isFinite(n) && n >= 0 && n <= 1) {
							this.plugin.settings.minConfidence = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName("Test connection")
			.setDesc("Runs vir doctor and shows the result.")
			.addButton((btn) =>
				btn.setButtonText("Test").onClick(async () => {
					btn.setDisabled(true).setButtonText("Testing…");
					try {
						const d = await this.plugin.client.doctor();
						new Notice(`Vir ${d.version}: daemon ${d.daemon}, vault ${d.vaultPath}`);
					} catch (err) {
						new Notice(`Vir: ${err instanceof Error ? err.message : String(err)}`);
					} finally {
						btn.setDisabled(false).setButtonText("Test");
					}
				}),
			);
	}
}
