import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import './style.css';

type ColumnCount = 2 | 3;

const normalizeColumnCount = (value: unknown): ColumnCount => (Number(value) === 3 ? 3 : 2);
const columnsSelectionPluginKey = new PluginKey('tiptap-columns-selection');

const isColumnsSelectHandleHit = (element: HTMLElement, event: MouseEvent) => {
	const rect = element.getBoundingClientRect();
	const handleInset = 4;
	const handleSize = 32;

	return (
		event.clientX >= rect.right - handleSize - handleInset &&
		event.clientX <= rect.right - handleInset &&
		event.clientY >= rect.top + handleInset &&
		event.clientY <= rect.top + handleSize + handleInset
	);
};

const findNodePosByDOM = (view: EditorView, element: HTMLElement, nodeName: string) => {
	let found: number | null = null;

	view.state.doc.descendants((node, pos) => {
		if (found !== null || node.type.name !== nodeName) return;
		if (view.nodeDOM(pos) === element) {
			found = pos;
			return false;
		}
	});

	return found;
};

const tryCreateNodeSelection = (doc: ProseMirrorNode, pos: number) => {
	if (pos < 0 || pos > doc.content.size) return null;
	const node = doc.nodeAt(pos);
	if (!node || node.type.spec.selectable === false) return null;

	try {
		return NodeSelection.create(doc, pos);
	} catch {
		return null;
	}
};

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
	selectable: true,

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
	},

	addProseMirrorPlugins() {
		const editor = this.editor;
		const nodeName = this.name;

		return [
			new Plugin({
				key: columnsSelectionPluginKey,
				props: {
					handleDOMEvents: {
						mousedown(view, event) {
							if (!editor.isEditable) return false;
							if (!(event.target instanceof HTMLElement)) return false;

							const columnsElement = event.target.closest<HTMLElement>('.tiptap-columns');
							if (!columnsElement || !isColumnsSelectHandleHit(columnsElement, event)) {
								return false;
							}

							const pos = findNodePosByDOM(view, columnsElement, nodeName);
							if (pos === null) return false;

							const selection = tryCreateNodeSelection(view.state.doc, pos);
							if (!selection) return false;

							event.preventDefault();
							event.stopPropagation();
							view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
							view.focus();
							return true;
						}
					}
				}
			})
		];
	}
});

export default [Columns, Column];
