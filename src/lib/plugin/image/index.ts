import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { dropImagePlugin } from '$lib/plugin/image/dragdrop';

export default (crossorigin = 'anonymous') =>
	Image.extend({
		addOptions() {
			const parentOptions =
				(this as unknown as { parent?: () => Record<string, unknown> }).parent?.() ?? {};

			return {
				...parentOptions,
				sizes: ['inline', 'block', 'left', 'right']
			};
		},
		parseHTML: () => [{ tag: 'img' }],
		renderHTML({
			HTMLAttributes
		}: {
			HTMLAttributes: Record<string, string | number | boolean | null | undefined>;
		}) {
			const style = HTMLAttributes.style;
			return [
				'figure',
				{ style },
				['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
			];
		},
		addProseMirrorPlugins() {
			return [dropImagePlugin()];
		}
	}).configure({ HTMLAttributes: { crossorigin } });
