import { setTooltip } from "obsidian";
import type VirPlugin from "./main";
import { resolveDaemonStatus } from "./lib/status";

export class VirStatusBar {
	private readonly item: HTMLElement;
	private readonly dot: HTMLElement;
	private intervalId: number | null = null;

	constructor(private plugin: VirPlugin) {
		this.item = this.plugin.addStatusBarItem();
		this.item.addClass("vir-status");
		this.dot = this.item.createSpan({ cls: "vir-status-dot is-unknown", text: "●" });
		this.plugin.registerDomEvent(this.item, "click", () => this.plugin.openSettings());
		setTooltip(this.item, "Vir");
	}

	start(): void {
		void this.poll();
		this.scheduleInterval(this.plugin.settings.pollIntervalMs);
	}

	restart(): void {
		this.scheduleInterval(this.plugin.settings.pollIntervalMs);
	}

	private scheduleInterval(ms: number): void {
		if (this.intervalId !== null) window.clearInterval(this.intervalId);
		this.intervalId = window.setInterval(() => void this.poll(), Math.max(5_000, ms));
		this.plugin.registerInterval(this.intervalId);
	}

	private async poll(): Promise<void> {
		let view;
		try {
			view = resolveDaemonStatus(await this.plugin.client.doctor());
		} catch (err) {
			view = resolveDaemonStatus(err instanceof Error ? err : new Error(String(err)));
		}
		this.dot.className = `vir-status-dot ${view.cls}`;
		setTooltip(this.item, view.tooltip);
	}
}
