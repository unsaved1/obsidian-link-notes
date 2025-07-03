import { LinkNotesPlugin } from "./core";
import { App, PluginSettingTab, Setting } from "obsidian";

export class SettingTab extends PluginSettingTab {
	plugin: LinkNotesPlugin;

	constructor(app: App, plugin: LinkNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Перезаписывать index файл")
			.addToggle((toggleEl) =>
				toggleEl
					.setValue(this.plugin.settings.rewriteIndexFile)
					.onChange(async (value) => {
						this.plugin.settings.rewriteIndexFile = value;
						await this.plugin.saveSettings();
					})
			);

		const suffix = this.plugin.settings.indexFileSuffix;

		new Setting(containerEl)
			.setName("Суффик для index файла")
			.addText((text) =>
				text
					.setPlaceholder("index")
					.setValue(this.plugin.settings.indexFileSuffix)
					.onChange((value) => {
						this.plugin.settings.indexFileSuffix = value;
					})
			)
			.addButton((btn) => {
				this.plugin.settings;
				btn.setButtonText("Применить");
				btn.onClick(async (e) => {
					e.preventDefault();
					await this.plugin.saveSettings();
					const allFiles = this.app.vault.getMarkdownFiles();
					try {
						for (const file of allFiles) {
							if (!file.name.includes(suffix)) {
								return;
							}
							await this.app.fileManager.renameFile(
								file,
								file.path.replace(
									suffix,
									this.plugin.settings.indexFileSuffix
								)
							);
						}
					} catch (err) {
						console.error(err);
					}
				});
			});
	}
}
