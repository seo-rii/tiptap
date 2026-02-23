import {
	setSlashItems,
	setSlashLocation,
	setSlashProps,
	slashState,
	type SlashDetail,
	type SlashGroup,
	type SlashItem
} from './stores.svelte';
import i18n from '$lib/i18n';
import type { UploadFn } from '$lib/plugin/image/dragdrop';
import { fallbackUpload } from '$lib/plugin/image/dragdrop';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor, Range } from '@tiptap/core';
import Suggestion, {
	type SuggestionKeyDownProps,
	type SuggestionOptions,
	type SuggestionProps
} from '@tiptap/suggestion';

type WindowWithTipTapGlobals = Window &
	typeof globalThis & {
		__tiptap_blocks?: SlashItem[];
		__image_uploader?: UploadFn;
	};

type DetailInput = Exclude<SlashDetail, null | 'emoji'>;

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

export function getDetail(editor: Editor, range: Range, option: DetailInput) {
	slashState.selection = () => {
		editor.chain().focus().deleteRange(fixRange(editor, range)).run();
	};
	slashState.detail = option;
}

export const suggest: Omit<SuggestionOptions<SlashGroup>, 'editor'> = {
	pluginKey: new PluginKey('slash-suggest'),
	char: '/',
	items: ({ query }) => {
		const blocks =
			typeof window !== 'undefined'
				? ((window as WindowWithTipTapGlobals).__tiptap_blocks ?? [])
				: [];

		const raw: SlashGroup[] = [
			{
				section: i18n('text'),
				list: [
					{
						icon: 'title',
						title: `${i18n('title')} 1`,
						subtitle: i18n('title1Info'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setNode('heading', { level: 1 })
								.run();
						}
					},
					{
						icon: 'title',
						title: `${i18n('title')} 2`,
						subtitle: i18n('title2Info'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setNode('heading', { level: 2 })
								.run();
						}
					},
					{
						icon: 'title',
						title: `${i18n('title')} 3`,
						subtitle: i18n('title3Info'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setNode('heading', { level: 3 })
								.run();
						}
					},
					{
						icon: 'format_list_bulleted',
						title: i18n('unorderedList'),
						subtitle: i18n('unorderedListInfo'),
						command: ({ editor, range }) => {
							editor.commands.deleteRange(fixRange(editor, range));
							editor.commands.toggleBulletList();
						}
					},
					{
						icon: 'format_list_numbered',
						title: i18n('numberList'),
						subtitle: i18n('numberListInfo'),
						command: ({ editor, range }) => {
							editor.commands.deleteRange(fixRange(editor, range));
							editor.commands.toggleOrderedList();
						}
					}
				]
			},
			{
				section: i18n('block'),
				list: [
					...blocks,
					{
						icon: 'image',
						title: i18n('image'),
						subtitle: i18n('imageInfo'),
						command: ({ editor, range }) => {
							editor.chain().focus().deleteRange(fixRange(editor, range)).run();

							const input = document.createElement('input');
							input.type = 'file';
							input.accept = 'image/*';
							input.onchange = async () => {
								if (!input.files?.length) return;

								const file = input.files[0];
								if (!file) return;

								const upload =
									(window as WindowWithTipTapGlobals).__image_uploader ?? fallbackUpload;
								const src = await upload(file);
								editor.chain().focus().deleteRange(range).setImage({ src }).run();
							};
							input.click();
						}
					},
					{
						icon: 'code',
						title: i18n('codeBlock'),
						subtitle: i18n('codeBlockInfo'),
						command: ({ editor, range }) =>
							getDetail(editor, range, {
								type: 'code',
								handler: (input?: string) => {
									editor
										.chain()
										.focus()
										.deleteRange(fixRange(editor, range))
										.setNode('codeBlock', { language: input })
										.run();
								}
							})
					},
					{
						icon: 'functions',
						title: i18n('mathBlock'),
						subtitle: i18n('mathBlockInfo'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setNode('math_display')
								.focus()
								.run();
						}
					},
					{
						icon: 'table_chart',
						title: i18n('table'),
						subtitle: i18n('tableInfo'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.insertTable({
									rows: 2,
									cols: 3
								})
								.run();
						}
					},
					{
						icon: 'format_quote',
						title: i18n('blockquote'),
						subtitle: i18n('blockquoteInfo'),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setBlockquote()
								.focus()
								.run();
						}
					},
					{
						icon: 'iframe',
						title: i18n('iframe'),
						subtitle: i18n('iframeInfo'),
						command: ({ editor, range }) =>
							getDetail(editor, range, {
								title: 'iframe',
								placeholder: 'url',
								handler: (input: string) => {
									editor
										.chain()
										.focus()
										.insertContent([
											{
												type: 'iframe',
												attrs: { src: input }
											},
											{ type: 'paragraph' }
										])
										.run();
								}
							})
					},
					{
						icon: 'youtube_activity',
						title: i18n('youtube'),
						subtitle: i18n('youtubeInfo'),
						command: ({ editor, range }) =>
							getDetail(editor, range, {
								title: 'youtube',
								placeholder: 'url',
								handler: (input: string) => {
									editor
										.chain()
										.focus()
										.insertVideoPlayer({ url: input })
										.insertContent('\n')
										.run();
								}
							})
					}
				]
			}
		];

		const normalizedQuery = query.toLowerCase();
		return raw
			.map(({ section, list }) => ({
				section,
				list: list.filter(
					(item) =>
						item.title.toLowerCase().includes(normalizedQuery) ||
						item.subtitle?.toLowerCase().includes(normalizedQuery)
				)
			}))
			.filter(({ list }) => list.length > 0);
	},

	render: () => {
		return {
			onStart: (props: SuggestionProps<SlashGroup>) => {
				const { editor, range } = props;
				setSlashProps({ editor, range });
				slashState.visible = true;
				slashState.selectedIndex = 0;
				setSlashItems(props.items);
				slashState.detail = null;

				const location = props.clientRect?.();
				if (location) {
					setSlashLocation({ x: location.x, y: location.y, height: location.height });
				}
			},

			onUpdate(props: SuggestionProps<SlashGroup>) {
				setSlashProps({ editor: props.editor, range: props.range });
				setSlashItems(props.items);
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'Escape') {
					slashState.visible = false;
					return true;
				}
				return false;
			},

			onExit() {
				slashState.visible = false;
			}
		};
	}
};

export default (editor: Editor) => Suggestion<SlashGroup>({ ...suggest, editor });
