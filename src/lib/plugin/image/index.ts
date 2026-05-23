import Image, { type ImageOptions } from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { dropImagePlugin } from '$lib/plugin/image/dragdrop';

type ImageOptionsWithSizes = ImageOptions & {
	sizes: string[];
};

export default (crossorigin = 'anonymous') =>
	Image.extend<ImageOptionsWithSizes>({
		addOptions() {
			const parentOptions = this.parent?.() ?? {};

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
				{ style, 'data-bubble-menu': 'false' },
				['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
			];
		},
		addProseMirrorPlugins() {
			return [dropImagePlugin()];
		}
	}).configure({ HTMLAttributes: { crossorigin } });
