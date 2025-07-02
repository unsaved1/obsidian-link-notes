import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFolder,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface IFileMapPath {
	key: string;
	value: string;
}

type TFileMapKey = string;
type TFileMapValue<T = TAbstractFile> = T | Map<string, TFileMapValue<T>>;
type TFileMap = Map<TFileMapKey, TFileMapValue<TAbstractFile>>;

interface MyPluginSettings {
	rewriteIndexFile: boolean;
	suffix: string;
}

function isFolder(arg: any): arg is TFolder {
	return typeof arg["children"] !== "undefined";
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	rewriteIndexFile: true,
	suffix: "index",
};

export default class MyTestingPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Greet",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("Hello from testing notice!");
			}
		);

		const ribbonIconLinkNotes = this.addRibbonIcon(
			"atom",
			"Link Notes",
			async () => {
				const fileMap: TFileMap = new Map();
				this.makeFileMap(
					fileMap,
					this.app.vault.getRoot(),
					async (current, input) => {
						if (!(current instanceof Map)) {
							return;
						}
						const paths: Array<IFileMapPath> = [];
						for (const [key, value] of current) {
							if (value instanceof Map) {
								paths.push({
									key: key,
									value: `${key}/${key}_${this.settings.suffix}`,
								});
								continue;
							}
							paths.push({ key: key, value: key });
						}
						const indexPath = this.makeIndexFilePath(
							input.path,
							input.name
						);
						const content = this.makeIndexFileContent(
							input.name,
							paths
						);
						try {
							const indexFile =
								this.app.vault.getFileByPath(indexPath);
							if (indexFile && this.settings.rewriteIndexFile) {
								this.app.vault.process(
									indexFile,
									() => content
								);
							} else {
								await this.app.vault.create(indexPath, content);
							}
						} catch (err) {
							console.error(err);
						}
					}
				);
				new Notice("Все заметки успешно связаны!");
				if (this.settings.rewriteIndexFile) {
					new Notice("Существующие index файлы были перезаписаны!");
				}
			}
		);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			// console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	makeFileMap(
		current: TFileMap,
		input: TAbstractFile,
		onCreateIndex: (
			current: TFileMapValue | null,
			input: TAbstractFile
		) => void
	) {
		if (!isFolder(input)) {
			if (input.path.includes(".md")) {
				current.set(input.name.replace(".md", ""), input);
			}
			return;
		}
		for (const child of input.children) {
			const currentFolder = current.get(input.name);
			if (currentFolder instanceof Map) {
				if (child.path.includes(".md")) {
					currentFolder.set(child.name.replace(".md", ""), child);
				}
				this.makeFileMap(currentFolder, child, onCreateIndex);
				continue;
			}
			const newFolder = new Map();
			if (input.isRoot()) {
				this.makeFileMap(current, child, onCreateIndex);
				continue;
			}
			current.set(input.name, newFolder);
			this.makeFileMap(newFolder, child, onCreateIndex);
		}
		onCreateIndex(
			current.get(input.name.replace(".md", "")) || current,
			input
		);
	}

	makeIndexFilePath(path: string, name: string) {
		if (path === "/") {
			return `root_${this.settings.suffix}.md`;
		}
		return `${path}/${name}_${this.settings.suffix}.md`;
	}

	makeIndexFileContent(name: string, paths: Array<IFileMapPath>) {
		const lines: Array<string> = [];
		const fmtName = name
			? name.at(0)?.toUpperCase() + name.slice(1)
			: "ROOT";
		lines.push(`# ${fmtName} \n`);
		for (const path of paths) {
			if (path.key.includes(this.settings.suffix)) {
				continue;
			}
			const fmtLinkName =
				path.key.at(0)?.toUpperCase() + path.key.slice(1);
			lines.push(`### [[${path.value}|${fmtLinkName}]] \n`);
		}
		return lines.join("");
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyTestingPlugin;

	constructor(app: App, plugin: MyTestingPlugin) {
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

		const suffix = this.plugin.settings.suffix;

		new Setting(containerEl)
			.setName("Суффик для index файла")
			.addText((text) =>
				text
					.setPlaceholder("index")
					.setValue(this.plugin.settings.suffix)
					.onChange((value) => {
						this.plugin.settings.suffix = value;
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
									this.plugin.settings.suffix
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
