import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { dropImagePlugin } from '$lib/plugin/image/dragdrop';

export default Image.extend({
	addOptions() {
		return {
			...this.parent?.(),
			sizes: ['inline', 'block', 'left', 'right']
		};
	},
	parseHTML: () => [{ tag: 'img' }],
	renderHTML({ HTMLAttributes }) {
		const { style } = HTMLAttributes;
		return [
			'figure',
			{ style },
			['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
		];
	},
	addProseMirrorPlugins() {
		return [dropImagePlugin()];
	}
}).configure({ HTMLAttributes: { crossorigin: 'anonymous' } });
