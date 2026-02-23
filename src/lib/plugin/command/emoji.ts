import {
	closeSlash,
	moveSlashSelection,
	runSlashItemAt,
	setSlashItems,
	setSlashLocation,
	setSlashProps,
	slashState,
	type SlashItem
} from './stores.svelte';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionOptions,
	type SuggestionProps
} from '@tiptap/suggestion';
import type { Editor, Range } from '@tiptap/core';

// @ts-ignore
import emojis from 'emojis-list';
// @ts-ignore
import tags from 'emojis-keywords';

const max = 10;

function fixRange(editor: Editor, rawRange: Range, split = '/'): Range {
	const range = { ...rawRange };
	const { state } = editor.view;
	const { selection, doc } = state;

	if (selection.$to.nodeBefore?.text?.includes?.(split)) {
		range.from = range.to;
		while (range.from > 0 && doc.textBetween(range.from - 1, range.from) !== split) {
			try {
				range.from -= 1;
			} catch {
				range.from += 2;
				break;
			}
		}
		range.from -= 1;
	}

	while (range.to < selection.to && doc.textBetween(range.to, range.to + 1) !== ' ') {
		try {
			range.to += 1;
		} catch {
			range.to -= 1;
			break;
		}
	}

	return range;
}

export const emoji: Omit<SuggestionOptions<SlashItem>, 'editor'> = {
	pluginKey: new PluginKey('slash-emoji'),
	char: ':',
	items: ({ query }) => {
		const normalizedQuery = `:${query.toLowerCase()}`;
		const filtered: SlashItem[] = [];

		for (let i = 0; i < emojis.length; i++) {
			if (tags[i]?.includes?.(normalizedQuery)) {
				const emojiValue = emojis[i];
				filtered.push({
					title: `${emojiValue}  ${tags[i]}`,
					command: ({ editor, range }) => {
						editor
							.chain()
							.deleteRange(fixRange(editor, range, ':'))
							.insertContent(`${emojiValue} `)
							.run();
					}
				});
			}
			if (filtered.length >= max) break;
		}

		return filtered;
	},

	render: () => {
		return {
			onStart: (props: SuggestionProps<SlashItem>) => {
				const { editor, range } = props;
				setSlashProps({ editor, range });
				slashState.visible = true;
				slashState.selectedIndex = 0;
				setSlashItems(props.items);
				slashState.detail = 'emoji';

				const location = props.clientRect?.();
				if (location) {
					setSlashLocation({ x: location.x, y: location.y, height: location.height });
				}
			},

			onUpdate(props: SuggestionProps<SlashItem>) {
				setSlashProps({ editor: props.editor, range: props.range });
				setSlashItems(props.items);
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'ArrowUp') {
					props.event.preventDefault();
					moveSlashSelection(-1);
					return true;
				}
				if (props.event.key === 'ArrowDown') {
					props.event.preventDefault();
					moveSlashSelection(1);
					return true;
				}
				if (props.event.key === 'Tab') {
					props.event.preventDefault();
					moveSlashSelection(props.event.shiftKey ? -1 : 1);
					return true;
				}
				if (props.event.key === 'Enter') {
					props.event.preventDefault();
					return runSlashItemAt(slashState.selectedIndex);
				}
				if (props.event.key === 'Escape') {
					closeSlash();
					return true;
				}
				return false;
			},

			onExit() {
				closeSlash();
			}
		};
	}
};

export default (editor: Editor) => Suggestion<SlashItem>({ ...emoji, editor });
