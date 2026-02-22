import { writable } from 'svelte/store';
import type { Editor, Range } from '@tiptap/core';

export type SlashCommandContext = {
	editor: Editor;
	range: Range;
};

export type SlashItem = {
	title: string;
	subtitle?: string;
	icon?: string;
	command: (context: SlashCommandContext) => void;
};

export type SlashGroup = {
	section: string;
	list: SlashItem[];
};

export type SlashDetail =
	| null
	| 'emoji'
	| {
			type: 'code';
			handler: (input?: string) => void;
	  }
	| {
			title: string;
			placeholder: string;
			handler: (input: string) => void;
	  };

export type SlashLocation = {
	x: number;
	y: number;
	height: number;
};

export type SlashProps = {
	editor: Editor | null;
	range: Range | null;
};

export const slashVisible = writable(false);
export const slashItems = writable<Array<SlashItem | SlashGroup>>([]);
export const slashLocation = writable<SlashLocation>({ x: 0, y: 0, height: 0 });
export const slashLocaltion = slashLocation;
export const slashProps = writable<SlashProps>({ editor: null, range: null });
export const slashDetail = writable<SlashDetail>(null);
export const slashSelection = writable<(() => void) | null>(null);
