import { Editor, Extension, mergeAttributes } from '@tiptap/core';
import {
	CodeBlockLowlight,
	type CodeBlockLowlightOptions
} from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import Code from '@tiptap/extension-code';
import Image from '$lib/plugin/image';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import DropCursor from '@tiptap/extension-dropcursor';
import orderedlist from '$lib/plugin/orderedlist';
import table from '$lib/plugin/table';
import tableHeader from '$lib/plugin/table/tableHeader';
import tableRow from '$lib/plugin/table/tableRow';
import tableCell from '$lib/plugin/table/tableCell';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Indent } from '$lib/plugin/indent';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Iframe from '$lib/plugin/iframe';
import Embed from '$lib/plugin/embed';
// @ts-ignore
import { MathInline, MathBlock } from '@seorii/prosemirror-math/tiptap';
import Youtube from '$lib/plugin/youtube';
import Placeholder from '@tiptap/extension-placeholder';

import command from '$lib/plugin/command/suggest';
import emoji from '$lib/plugin/command/emoji';
import {
	countSlashItems,
	moveSlashSelection,
	runSlashItemAt,
	slashState
} from '$lib/plugin/command/stores.svelte';
import i18n from '$lib/i18n';

import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import go from 'highlight.js/lib/languages/go';
import csharp from 'highlight.js/lib/languages/csharp';
import rust from 'highlight.js/lib/languages/rust';

type CodeBlockLanguageOption = {
	value: string;
	label: string;
};

type CodeBlockLanguageLabelMap = Record<string, string>;
type CodeBlockWithLanguageSelectOptions = CodeBlockLowlightOptions & {
	languageLabelMap: CodeBlockLanguageLabelMap;
};

const codeBlockLanguageOptions: CodeBlockLanguageOption[] = [
	{ value: 'auto', label: 'auto' },
	{ value: 'cpp', label: 'cpp' },
	{ value: 'python', label: 'python' },
	{ value: 'java', label: 'java' },
	{ value: 'js', label: 'js' },
	{ value: 'ts', label: 'ts' },
	{ value: 'kotlin', label: 'kotlin' },
	{ value: 'go', label: 'go' },
	{ value: 'csharp', label: 'csharp' },
	{ value: 'rust', label: 'rust' }
];

const lowlight = () => {
	const lowlight = createLowlight(all);

	lowlight.register('js', js);
	lowlight.register('ts', ts);
	lowlight.register('python', python);
	lowlight.register('cpp', cpp);
	lowlight.register('java', java);
	lowlight.register('kotlin', kotlin);
	lowlight.register('go', go);
	lowlight.register('csharp', csharp);
	lowlight.register('rust', rust);
	return lowlight;
};

const normalizeCodeBlockLanguage = (language: unknown) => {
	if (typeof language !== 'string') return 'auto';
	const normalized = language.trim();
	return normalized.length ? normalized : 'auto';
};

const resolveCodeBlockLanguageLabel = (
	value: string,
	labelMap: CodeBlockLanguageLabelMap,
	fallbackLabel = value
) => {
	const label = labelMap[value]?.trim();
	return label?.length ? label : fallbackLabel;
};

const slashKeymap = Extension.create({
	name: 'slash-keymap',
	priority: 10000,
	addKeyboardShortcuts() {
		return {
			Enter: () => {
				if (!slashState.visible) return false;
				return runSlashItemAt(slashState.selectedIndex);
			},
			Tab: () => {
				if (!slashState.visible || countSlashItems() === 0) return false;
				moveSlashSelection(1);
				return true;
			},
			'Shift-Tab': () => {
				if (!slashState.visible || countSlashItems() === 0) return false;
				moveSlashSelection(-1);
				return true;
			},
			ArrowUp: () => {
				if (!slashState.visible || countSlashItems() === 0) return false;
				moveSlashSelection(-1);
				return true;
			},
			ArrowDown: () => {
				if (!slashState.visible || countSlashItems() === 0) return false;
				moveSlashSelection(1);
				return true;
			}
		};
	}
});

type CrossOrigin = 'anonymous' | 'use-credentials' | undefined;

const CodeBlockWithLanguageSelect = CodeBlockLowlight.extend<CodeBlockWithLanguageSelectOptions>({
	addOptions() {
		return {
			...this.parent?.(),
			languageLabelMap: {} as CodeBlockLanguageLabelMap
		};
	},
	addKeyboardShortcuts() {
		return {
			...this.parent?.(),
			Tab: () => {
				if (this.editor.isActive('codeBlock')) {
					return this.editor.commands.insertContent('    ');
				}
				return false;
			}
		};
	},
	addNodeView() {
		return ({ node, getPos, editor }) => {
			let currentNode = node;
			const languageLabelMap = this.options.languageLabelMap || {};

			const dom = document.createElement('div');
			dom.className = 'tiptap-code-block';

			const toolbar = document.createElement('div');
			toolbar.className = 'tiptap-code-block-toolbar';

			const languageSelect = document.createElement('select');
			languageSelect.className = 'tiptap-code-block-language';
			for (const option of codeBlockLanguageOptions) {
				const element = document.createElement('option');
				element.value = option.value;
				element.textContent = resolveCodeBlockLanguageLabel(
					option.value,
					languageLabelMap,
					option.label
				);
				languageSelect.append(element);
			}
			toolbar.append(languageSelect);

			const pre = document.createElement('pre');
			const contentDOM = document.createElement('code');
			pre.append(contentDOM);
			dom.append(toolbar, pre);

			const ensureLanguageOption = (value: string) => {
				if ([...languageSelect.options].some((option) => option.value === value)) return;
				const element = document.createElement('option');
				element.value = value;
				element.textContent = resolveCodeBlockLanguageLabel(value, languageLabelMap);
				languageSelect.append(element);
			};

			const syncLanguageSelection = () => {
				const language = normalizeCodeBlockLanguage(currentNode.attrs.language);
				ensureLanguageOption(language);
				languageSelect.value = language;
			};

			const handleLanguageChange = () => {
				let pos: number | null = null;
				try {
					pos = getPos();
				} catch {
					pos = null;
				}
				if (typeof pos !== 'number') return;

				const selectedLanguage = languageSelect.value;
				const language = selectedLanguage === 'auto' ? null : selectedLanguage;
				const latestNode = editor.state.doc.nodeAt(pos);
				if (!latestNode || latestNode.type.name !== this.name) return;

				editor.commands.command(({ tr, dispatch }) => {
					tr.setNodeMarkup(pos, undefined, {
						...latestNode.attrs,
						language
					});
					dispatch?.(tr);
					return true;
				});
			};

			languageSelect.addEventListener('change', handleLanguageChange);
			syncLanguageSelection();

			return {
				dom,
				contentDOM,
				update: (updatedNode) => {
					if (updatedNode.type !== currentNode.type) return false;
					currentNode = updatedNode;
					syncLanguageSelection();
					return true;
				},
				stopEvent: (event) => {
					const target = event.target;
					if (!(target instanceof HTMLElement)) return false;
					return Boolean(target.closest('.tiptap-code-block-toolbar'));
				},
				destroy: () => {
					languageSelect.removeEventListener('change', handleLanguageChange);
				}
			};
		};
	}
});

const extensions = (
	placeholder: string,
	plugins: any[],
	crossorigin: CrossOrigin,
	codeBlockLanguageLabels: CodeBlockLanguageLabelMap
) => [
	CodeBlockWithLanguageSelect.configure({
		lowlight: lowlight(),
		languageLabelMap: codeBlockLanguageLabels
	}),
	slashKeymap,
	Image(crossorigin),
	Youtube,
	StarterKit,
	Underline,
	Highlight.configure({ multicolor: true }),
	Link.configure({
		openOnClick: true,
		protocols: [
			'ftp',
			'mailto',
			{
				scheme: 'tel',
				optionalSlashes: true
			}
		]
	}),
	TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
	DropCursor,
	orderedlist,
	MathInline,
	MathBlock,
	table,
	tableHeader,
	tableRow,
	tableCell,
	Superscript,
	Subscript,
	Indent,
	Color,
	TextStyle,
	Iframe,
	Embed,
	Code.extend({
		renderHTML({ HTMLAttributes }) {
			return ['code', mergeAttributes(HTMLAttributes, { class: 'inline' })];
		}
	}),
	Placeholder.configure({ placeholder }),
	...plugins
];

export default (
	element: Element,
	content: string,
	{
		placeholder = i18n('placeholder'),
		plugins = [],
		crossorigin,
		codeBlockLanguageLabels = {},
		...props
	}: {
		placeholder?: string;
		plugins?: any[];
		crossorigin?: CrossOrigin;
		codeBlockLanguageLabels?: CodeBlockLanguageLabelMap;
		[key: string]: unknown;
	} = {}
) => {
	const tt = new Editor({
		element,
		content,
		...props,
		extensions: extensions(placeholder, plugins, crossorigin, codeBlockLanguageLabels)
	});
	// Suggestion key handlers must run before default keymap handlers.
	tt.registerPlugin(emoji(tt), (plugin, all) => [plugin, ...all]);
	tt.registerPlugin(command(tt), (plugin, all) => [plugin, ...all]);
	return tt;
};
