import { mergeAttributes, Node } from '@tiptap/core';

export interface EmbedOptions {
	allowFullscreen: boolean;
	HTMLAttributes: {
		[key: string]: any;
	};
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		embed: {
			setEmbed: (options: {
				src: string;
				type: string;
				width?: string;
				height?: string;
			}) => ReturnType;
		};
	}
}

export default Node.create<EmbedOptions>({
	name: 'embed',
	group: 'block',
	atom: true,

	addOptions() {
		return {
			allowFullscreen: true,
			HTMLAttributes: {
				class: 'embed-wrapper'
			}
		};
	},

	addAttributes() {
		return {
			src: { default: null },
			frameborder: { default: 0 },
			allowfullscreen: {
				default: this.options.allowFullscreen,
				parseHTML: () => this.options.allowFullscreen
			},
			width: { default: '100%' },
			height: { default: '800px' },
			type: { default: '' }
		};
	},

	parseHTML() {
		return [
			{
				tag: 'embed'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, { 'data-bubble-menu': 'false' }),
			['embed', mergeAttributes(HTMLAttributes, { credentialless: true, crossorigin: 'anonymous' })]
		];
	},

	addCommands() {
		return {
			setEmbed:
				(options: { src: string; type: string; width?: string; height?: string }) =>
				({ tr, dispatch }) => {
					const { selection } = tr;
					const node = this.type.create({
						width: options.width ?? '100%',
						height: options.height ?? '800px',
						...options
					});
					if (dispatch) tr.replaceRangeWith(selection.from, selection.to, node);

					return true;
				}
		};
	}
});
