import { slashVisible, slashItems, slashLocation, slashProps, slashDetail } from './stores';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionOptions,
	type SuggestionProps
} from '@tiptap/suggestion';
import type { Editor, Range } from '@tiptap/core';
import type { SlashItem } from './stores';

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
				slashProps.set({ editor, range });
				slashVisible.set(true);
				slashItems.set(props.items);
				slashDetail.set('emoji');

				const location = props.clientRect?.();
				if (location) {
					slashLocation.set({ x: location.x, y: location.y, height: location.height });
				}
			},

			onUpdate(props: SuggestionProps<SlashItem>) {
				slashItems.set(props.items);
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'Escape') {
					slashVisible.set(false);
					return true;
				}
				return false;
			},

			onExit() {
				slashVisible.set(false);
			}
		};
	}
};

export default (editor: Editor) => Suggestion<SlashItem>({ ...emoji, editor });
