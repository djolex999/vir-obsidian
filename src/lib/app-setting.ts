import type { App } from "obsidian";

interface AppWithSetting {
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
}

export function openPluginSettings(app: App, pluginId: string): void {
	const a = app as unknown as AppWithSetting;
	a.setting.open();
	a.setting.openTabById(pluginId);
}
