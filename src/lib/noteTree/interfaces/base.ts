import { TAbstractFile } from "obsidian";

export type TTreeKey = string;
export type TTreeValue<T = TAbstractFile> = T | Map<string, TTreeValue<T>>;
export type TTree = Map<TTreeKey, TTreeValue<TAbstractFile>>;

export interface ITreeItemPath {
	key: string;
	value: string;
}

