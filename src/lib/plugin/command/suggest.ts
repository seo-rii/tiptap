import {
	closeSlash,
	moveSlashSelection,
	runSlashItemAt,
	setSlashItems,
	setSlashLocation,
	setSlashProps,
	slashState,
	type SlashDetail,
	type SlashGroup,
	type SlashItem
} from './stores.svelte';
import i18n from '$lib/i18n';
import enUs from '$lib/i18n/en-us/index';
import koKr from '$lib/i18n/ko-kr/index';
import {
	fallbackUpload,
	releaseObjectUrlOnImageSettled,
	type UploadFn
} from '$lib/plugin/image/dragdrop';
import { insertUploadSkeleton } from '$lib/plugin/upload/skeleton';
import { PluginKey, TextSelection } from '@tiptap/pm/state';
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
type LocaleKey = Exclude<keyof typeof enUs, 'target' | 'lang' | 'country'>;

const normalizeSearch = (value: string) => value.toLowerCase().trim();
const compactSearch = (value: string) => normalizeSearch(value).replace(/\s+/g, '');

function localeText(key: LocaleKey, locale: typeof enUs | typeof koKr): string {
	const value = locale[key];
	return typeof value === 'string' ? value : '';
}

function createKeywords(keys: LocaleKey[], extra: string[] = []): string[] {
	return [
		...new Set(
			[...extra, ...keys.flatMap((key) => [localeText(key, enUs), localeText(key, koKr)])]
				.map(normalizeSearch)
				.filter(Boolean)
		)
	];
}

function matchQuery(value: string, query: string, compactQuery: string): boolean {
	const normalizedValue = normalizeSearch(value);
	return normalizedValue.includes(query) || compactSearch(normalizedValue).includes(compactQuery);
}

function matchItem(item: SlashItem, query: string, compactQuery: string): boolean {
	if (!query) return true;
	return [item.title, item.subtitle ?? '', ...(item.keywords ?? [])].some((value) =>
		matchQuery(value, query, compactQuery)
	);
}

function fixRange(editor: Editor, rawRange: Range, split = '/'): Range {
	const doc = editor.state.doc;
	const docSize = doc.content.size;
	const range: Range = {
		from: Math.max(0, Math.min(rawRange.from, docSize)),
		to: Math.max(0, Math.min(rawRange.to, docSize))
	};

	if (range.to < range.from) range.to = range.from;

	if (doc.textBetween(range.from, Math.min(range.from + 1, docSize)) !== split && range.from > 0) {
		const minFrom = Math.max(0, range.from - 64);
		for (let cursor = range.from; cursor > minFrom; cursor -= 1) {
			const char = doc.textBetween(cursor - 1, cursor);
			if (!char || /\s/.test(char)) break;
			if (char !== split) continue;
			range.from = cursor - 1;
			break;
		}
	}

	while (range.to < docSize) {
		const next = doc.textBetween(range.to, range.to + 1);
		if (!next || /\s/.test(next)) break;
		range.to += 1;
	}

	return range;
}

function clampDocPos(editor: Editor, pos: number): number {
	return Math.max(0, Math.min(pos, editor.state.doc.content.size));
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
						keywords: createKeywords(['title', 'title1Info'], ['heading 1', 'h1']),
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
						keywords: createKeywords(['title', 'title2Info'], ['heading 2', 'h2']),
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
						keywords: createKeywords(['title', 'title3Info'], ['heading 3', 'h3']),
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
						keywords: createKeywords(['unorderedList', 'unorderedListInfo'], ['bullet list', 'ul']),
						command: ({ editor, range }) => {
							editor.commands.deleteRange(fixRange(editor, range));
							editor.commands.toggleBulletList();
						}
					},
					{
						icon: 'format_list_numbered',
						title: i18n('numberList'),
						subtitle: i18n('numberListInfo'),
						keywords: createKeywords(['numberList', 'numberListInfo'], ['ordered list', 'ol']),
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
						keywords: createKeywords(['image', 'imageInfo']),
						command: ({ editor, range }) => {
							const fixedRange = fixRange(editor, range);
							editor.chain().focus().deleteRange(fixedRange).run();
							let insertAt = clampDocPos(editor, fixedRange.from);
							let insertParagraph = true;

							const { selection } = editor.state;
							if (
								selection.empty &&
								selection.$from.depth > 0 &&
								selection.$from.parent.isTextblock &&
								selection.$from.parent.content.size === 0
							) {
								insertAt = clampDocPos(editor, selection.$from.before(selection.$from.depth));
								insertParagraph = false;
							}

							const input = document.createElement('input');
							input.type = 'file';
							input.accept = 'image/*';
							input.onchange = async () => {
								if (!input.files?.length) return;

								const file = input.files[0];
								if (!file) return;

								const skeleton = insertUploadSkeleton(editor, {
									kind: 'image',
									height: 220,
									at: insertAt,
									insertParagraph
								});

								try {
									const imageUploader = (window as WindowWithTipTapGlobals).__image_uploader;
									const upload = imageUploader ?? fallbackUpload;
									const src = await upload(file);
									if (skeleton) {
										skeleton.replaceWith({
											type: 'image',
											attrs: { src }
										});
									} else {
										editor
											.chain()
											.insertContentAt(
												clampDocPos(editor, insertAt),
												insertParagraph
													? [{ type: 'image', attrs: { src } }, { type: 'paragraph' }]
													: { type: 'image', attrs: { src } }
											)
											.run();
									}
									if (imageUploader) {
										releaseObjectUrlOnImageSettled(editor.view, src);
									}
								} catch {
									skeleton?.remove();
								}
							};
							input.click();
						}
					},
					{
						icon: 'code',
						title: i18n('codeBlock'),
						subtitle: i18n('codeBlockInfo'),
						keywords: createKeywords(['codeBlock', 'codeBlockInfo'], ['code']),
						command: ({ editor, range }) => {
							editor
								.chain()
								.focus()
								.deleteRange(fixRange(editor, range))
								.setNode('codeBlock', { language: null })
								.command(({ tr }) => {
									const { from } = tr.selection;
									const $from = tr.doc.resolve(from);

									if ($from.parent.type.name === 'codeBlock') {
										tr.setSelection(TextSelection.create(tr.doc, $from.start()));
										return true;
									}

									const before = $from.nodeBefore;
									if (before?.type.name === 'codeBlock') {
										const positionInsideCodeBlock = from - before.nodeSize + 1;
										tr.setSelection(TextSelection.create(tr.doc, positionInsideCodeBlock));
										return true;
									}

									const after = $from.nodeAfter;
									if (after?.type.name === 'codeBlock') {
										tr.setSelection(TextSelection.create(tr.doc, from + 1));
									}

									return true;
								})
								.focus()
								.run();
						}
					},
					{
						icon: 'functions',
						title: i18n('mathBlock'),
						subtitle: i18n('mathBlockInfo'),
						keywords: createKeywords(['mathBlock', 'mathBlockInfo'], ['latex', 'equation']),
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
						keywords: createKeywords(['table', 'tableInfo']),
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
						icon: 'view_column_2',
						title: i18n('twoColumns'),
						subtitle: i18n('twoColumnsInfo'),
						keywords: createKeywords(
							['twoColumns', 'twoColumnsInfo'],
							['2 columns', 'two columns', 'notion']
						),
						command: ({ editor, range }) => {
							editor.chain().focus().deleteRange(fixRange(editor, range)).setTwoColumns().run();
						}
					},
					{
						icon: 'view_week',
						title: i18n('threeColumns'),
						subtitle: i18n('threeColumnsInfo'),
						keywords: createKeywords(
							['threeColumns', 'threeColumnsInfo'],
							['3 columns', 'three columns', 'notion']
						),
						command: ({ editor, range }) => {
							editor.chain().focus().deleteRange(fixRange(editor, range)).setThreeColumns().run();
						}
					},
					{
						icon: 'format_quote',
						title: i18n('blockquote'),
						subtitle: i18n('blockquoteInfo'),
						keywords: createKeywords(['blockquote', 'blockquoteInfo'], ['quote']),
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
						keywords: createKeywords(['iframe', 'iframeInfo'], ['embed', 'url']),
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
						keywords: createKeywords(['youtube', 'youtubeInfo'], ['video']),
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

		const normalizedQuery = normalizeSearch(query);
		const compactQuery = compactSearch(query);
		return raw
			.map(({ section, list }) => ({
				section,
				list: list.filter((item) => matchItem(item, normalizedQuery, compactQuery))
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

export default (editor: Editor) => Suggestion<SlashGroup>({ ...suggest, editor });
