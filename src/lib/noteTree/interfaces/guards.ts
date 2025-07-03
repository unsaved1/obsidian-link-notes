import { TFolder } from "obsidian";

export function isFolder(arg: any): arg is TFolder {
	return typeof arg["children"] !== "undefined";
}
