import {
	slashVisible,
	slashItems,
	slashLocaltion,
	slashProps,
	slashDetail,
	slashSelection
} from './stores';
import i18n from '$lib/i18n';
import type { UploadFn } from '$lib/plugin/image/dragdrop';
import { fallbackUpload } from '$lib/plugin/image/dragdrop';
import { PluginKey } from 'prosemirror-state';
import { Editor } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

function fixRange(editor: Editor, range: any, split = '/') {
	const { state } = editor.view,
		{ selection, doc } = state;
	if (selection.$to.nodeBefore?.text?.includes?.(split)) {
		range.from = range.to;
		while (range.from > 0 && doc.textBetween(range.from - 1, range.from) !== split) {
			try {
				range.from -= 1;
			} catch (e) {
				range.from += 2;
				break;
			}
		}
		range.from -= 1;
	}
	while (range.to < selection.to && doc.textBetween(range.to, range.to + 1) !== ' ') {
		try {
			range.to += 1;
		} catch (e) {
			range.to -= 1;
			break;
		}
	}
	return range;
}

export function getDetail(editor, range, opt) {
	slashSelection.set(() => editor.chain().focus().deleteRange(fixRange(editor, range)).run());
	slashDetail.set(opt);
}

export const suggest = {
	pluginKey: new PluginKey('slash-suggest'),
	char: '/',
	items: ({ query }) => {
		const raw = [
			{
				section: i18n('text'),
				list: [
					{
						icon: 'title',
						title: i18n('title') + ' 1',
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
						title: i18n('title') + ' 2',
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
						title: i18n('title') + ' 3',
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
					...(<any>window).__tiptap_blocks,
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
								if (input.files) {
									const file = input.files[0];
									if (file) {
										const upload: UploadFn = (<any>window).__image_uploader || fallbackUpload;
										const src = await upload(file);
										editor.chain().focus().deleteRange(range).setImage({ src }).run();
									}
								}
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
								handler: (input) => {
									editor
										.chain()
										.focus()
										.deleteRange(fixRange(editor, range - 1))
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
							const { to } = range;
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
								handler: (input) => {
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
								handler: (input) => {
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

		const filtered = raw
			.map(({ section, list }) => ({
				section,
				list: list.filter(
					(item) =>
						item.title.toLowerCase().includes(query.toLowerCase()) ||
						item.subtitle.toLowerCase().includes(query.toLowerCase())
				)
			}))
			.filter(({ list }) => list.length > 0);

		return filtered;
	},

	render: () => {
		return {
			onStart: (props) => {
				let editor = props.editor;
				let range = props.range;
				let location = props.clientRect();
				slashProps.set({ editor, range });
				slashVisible.set(true);
				slashLocaltion.set({ x: location.x, y: location.y, height: location.height });
				slashItems.set(props.items);
				slashDetail.set(null);
			},

			onUpdate(props) {
				slashItems.set(props.items);
			},

			onKeyDown(props) {
				if (props.event.key === 'Escape') {
					slashVisible.set(false);
					return true;
				}
			},

			onExit() {
				slashVisible.set(false);
			}
		};
	}
};

export default (editor: Editor) => Suggestion({ ...suggest, editor });
