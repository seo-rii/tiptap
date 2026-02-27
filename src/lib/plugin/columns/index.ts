import { Node, mergeAttributes } from '@tiptap/core';

import './style.css';

type ColumnCount = 2 | 3;

const normalizeColumnCount = (value: unknown): ColumnCount => (Number(value) === 3 ? 3 : 2);

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		columnLayout: {
			setColumns: (count: ColumnCount) => ReturnType;
			setTwoColumns: () => ReturnType;
			setThreeColumns: () => ReturnType;
		};
	}
}

const Column = Node.create({
	name: 'column',
	content: 'block+',
	isolating: true,
	defining: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	parseHTML() {
		return [{ tag: 'div.tiptap-column' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'tiptap-column'
			}),
			0
		];
	}
});

const Columns = Node.create({
	name: 'columns',
	group: 'block',
	content: 'column{2,3}',
	isolating: true,
	defining: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	addAttributes() {
		return {
			count: {
				default: 2,
				parseHTML: (element: Element) => {
					if (!(element instanceof HTMLElement)) return 2;
					if (element.classList.contains('columns-3')) return 3;
					if (element.classList.contains('columns-2')) return 2;
					const columnCount = Array.from(element.children).filter(
						(child) => child instanceof HTMLElement && child.classList.contains('tiptap-column')
					).length;
					return columnCount >= 3 ? 3 : 2;
				},
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div.tiptap-columns' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const count = normalizeColumnCount(node.attrs.count);
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: `tiptap-columns columns-${count}`
			}),
			0
		];
	},

	addCommands() {
		return {
			setColumns:
				(count: ColumnCount) =>
				({ commands }) => {
					const normalizedCount = normalizeColumnCount(count);
					return commands.insertContent({
						type: this.name,
						attrs: { count: normalizedCount },
						content: Array.from({ length: normalizedCount }, () => ({
							type: 'column',
							content: [{ type: 'paragraph' }]
						}))
					});
				},
			setTwoColumns:
				() =>
				({ commands }) =>
					commands.setColumns(2),
			setThreeColumns:
				() =>
				({ commands }) =>
					commands.setColumns(3)
		};
	}
});

export default [Columns, Column];
