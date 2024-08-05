import CodeBlock, { type CodeBlockOptions } from '@tiptap/extension-code-block';
import type { BundledLanguage, BundledTheme } from 'shiki';

import { ShikiPlugin } from './shiki-plugin';

export interface CodeBlockShikiOptions extends CodeBlockOptions {
	defaultLanguage: BundledLanguage | null | undefined;
	defaultTheme: BundledTheme;
}

export const CodeBlockShiki = CodeBlock.extend<CodeBlockShikiOptions>({
	addOptions() {
		return {
			...this.parent?.(),
			defaultLanguage: 'cpp',
			defaultTheme: 'github-light'
		};
	},

	addProseMirrorPlugins() {
		return [
			...(this.parent?.() || []),
			ShikiPlugin({
				name: this.name,
				defaultLanguage: this.options.defaultLanguage,
				defaultTheme: this.options.defaultTheme
			})
		];
	},

	addKeyboardShortcuts() {
		return {
			...this.parent?.(),
			'Tab': () => {
				if (this.editor.isActive('codeBlock')) {
					return this.editor.commands.insertContent('    ');
				}
				return true;
			}
		};
	},
});