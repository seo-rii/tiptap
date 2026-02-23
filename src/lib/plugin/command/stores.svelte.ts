import type { Editor, Range } from '@tiptap/core';

export type SlashCommandContext = {
	editor: Editor;
	range: Range;
};

export type SlashItem = {
	title: string;
	subtitle?: string;
	icon?: string;
	keywords?: string[];
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

export type SlashEntry = SlashItem | SlashGroup;

export const slashState = $state({
	visible: false,
	items: [] as SlashEntry[],
	location: { x: 0, y: 0, height: 0 } as SlashLocation,
	props: { editor: null, range: null } as SlashProps,
	detail: null as SlashDetail,
	selection: null as (() => void) | null,
	selectedIndex: 0
});

// keep typo alias for backward compatibility
export const slashLocaltion = slashState.location;

export function isSlashGroup(item: SlashEntry): item is SlashGroup {
	return 'list' in item;
}

export function isSlashItem(item: SlashEntry): item is SlashItem {
	return 'command' in item;
}

export function flattenSlashItems(items: SlashEntry[] = slashState.items): SlashItem[] {
	if (!items.length) return [];
	if (isSlashGroup(items[0])) {
		return items.flatMap((item) => (isSlashGroup(item) ? item.list : []));
	}
	return items.filter(isSlashItem);
}

export function countSlashItems(items: SlashEntry[] = slashState.items): number {
	return flattenSlashItems(items).length;
}

export function moveSlashSelection(delta: number) {
	const count = countSlashItems();
	if (count === 0) {
		slashState.selectedIndex = 0;
		return;
	}
	slashState.selectedIndex += delta;
	normalizeSlashIndex();
}

export function normalizeSlashIndex() {
	const count = countSlashItems();
	if (count === 0) {
		slashState.selectedIndex = 0;
		return;
	}
	slashState.selectedIndex = ((slashState.selectedIndex % count) + count) % count;
}

export function setSlashItems(items: SlashEntry[]) {
	slashState.items = items;
	normalizeSlashIndex();
}

export function setSlashProps(props: SlashProps) {
	slashState.props = props;
}

export function setSlashLocation(location: SlashLocation) {
	slashState.location.x = location.x;
	slashState.location.y = location.y;
	slashState.location.height = location.height;
}

export function runSlashItemAt(index: number): boolean {
	const item = flattenSlashItems()[index];
	const { editor, range } = slashState.props;
	if (!item || !editor || !range) return false;
	item.command({ editor, range });
	return true;
}

export function closeSlash() {
	slashState.visible = false;
	slashState.selectedIndex = 0;
}
