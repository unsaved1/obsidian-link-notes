import { ILinkNotesSettings } from "./interfaces/base";
import { Notice, Plugin, TAbstractFile } from "obsidian";
import { NoteTree, TTree, ITreeItemPath, TTreeValue } from "./lib";
import { SettingTab } from "./settings";

const DEFAULT_SETTINGS: ILinkNotesSettings = {
	rewriteIndexFile: true,
	indexFileSuffix: "index",
	headerDevider: "---",
};

export class LinkNotesPlugin extends Plugin {
	settings: ILinkNotesSettings;

	async onload() {
		await this.loadSettings();
		this.addRibbonIcon("atom", "Link Notes", async () => {
			const tree: TTree = new Map();
			const root = this.app.vault.getRoot();
			const noteTree = new NoteTree();
			await noteTree.make(tree, root, (current, input) =>
				LinkNotesPlugin.handleLinkNotes(current, input, this)
			);
			new Notice("Все заметки успешно связаны!");
			if (this.settings.rewriteIndexFile) {
				new Notice("Существующие index файлы были перезаписаны!");
			}
		});
		this.addSettingTab(new SettingTab(this.app, this));
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

	static async handleLinkNotes(
		current: TTreeValue | null,
		input: TAbstractFile,
		context: LinkNotesPlugin
	) {
		console.log(this);
		if (!(current instanceof Map)) {
			return;
		}
		const paths: Array<ITreeItemPath> = [];
		for (const [key, value] of current) {
			if (value instanceof Map) {
				paths.push({
					key: key,
					value: `${key}/${key}_${context.settings.indexFileSuffix}`,
				});
				continue;
			}
			paths.push({ key: key, value: key });
		}
		const indexPath = context.makeIndexFilePath(input.path, input.name);
		let indexHeader = "";
		if (paths.length) {
			indexHeader = context.makeIndexFileHeader(input.name, paths);
		}
		try {
			const indexFile = context.app.vault.getFileByPath(indexPath);
			if (indexFile && context.settings.rewriteIndexFile) {
				context.app.vault.process(indexFile, (data) => {
					const endIndex = data.indexOf(
						context.settings.headerDevider
					);
					const prevHeader = data.substring(
						0,
						endIndex + context.settings.headerDevider.length
					);
					return data.replace(prevHeader, indexHeader);
				});
			} else {
				await context.app.vault.create(indexPath, indexHeader);
			}
		} catch (err) {
			console.error(err);
		}
	}

	makeIndexFilePath(path: string, name: string) {
		if (path === "/") {
			return `root_${this.settings.indexFileSuffix}.md`;
		}
		return `${path}/${name}_${this.settings.indexFileSuffix}.md`;
	}

	makeIndexFileHeader(name: string, paths: Array<ITreeItemPath>) {
		const lines: Array<string> = [];
		const fmtName = name
			? name.at(0)?.toUpperCase() + name.slice(1)
			: "ROOT";
		lines.push(`# ${fmtName} \n`);
		for (const path of paths) {
			if (path.key.includes(this.settings.indexFileSuffix)) {
				continue;
			}
			const fmtLinkName =
				path.key.at(0)?.toUpperCase() + path.key.slice(1);
			lines.push(`### [[${path.value}|${fmtLinkName}]] \n`);
		}
		lines.push("---");
		return lines.join("");
	}
}
