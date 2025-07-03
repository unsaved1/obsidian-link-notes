import { TAbstractFile } from "obsidian";
import { isFolder, TTree, TTreeValue } from "./interfaces";

export class NoteTree {
	async make(
		current: TTree,
		input: TAbstractFile,
		onNextFolder: (
			current: TTreeValue | null,
			input: TAbstractFile
		) => Promise<void>
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
				this.make(currentFolder, child, onNextFolder);
				continue;
			}
			const newFolder = new Map();
			if (input.isRoot()) {
				this.make(current, child, onNextFolder);
				continue;
			}
			current.set(input.name, newFolder);
			this.make(newFolder, child, onNextFolder);
		}
		await onNextFolder(
			current.get(input.name.replace(".md", "")) || current,
			input
		);
	}
}
