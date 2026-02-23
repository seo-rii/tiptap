import { Table as BuiltInTable } from '@tiptap/extension-table';
import { Plugin } from 'prosemirror-state';
import { tableEditing, columnResizing } from 'prosemirror-tables';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import deleteTable from './deleteTable';

import './style.css';

const resolveTableElement = (view: EditorView | null | undefined, pos: number) => {
	if (!view) return null;

	const dom = view.nodeDOM(pos);
	if (dom instanceof HTMLTableElement) return dom;
	if (!(dom instanceof HTMLElement)) return null;

	const table = dom.querySelector('table');
	return table instanceof HTMLTableElement ? table : null;
};

export default BuiltInTable.extend({
	renderHTML() {
		return [
			'div',
			{ class: 'node-table' },
			[
				'div',
				{ class: `scrollable` },
				['table', { class: `as-table render-wrapper` }, ['tbody', 0]]
			]
		];
	},

	addProseMirrorPlugins() {
		return [
			tableEditing(),
			columnResizing({}),
			new Plugin({
				props: {
					decorations: (state) => {
						const { doc } = state;
						const decorations: Decoration[] = [];
						const isEditable = this.editor.isEditable;
						const view = this.editor.view;

						doc.descendants((node, pos) => {
							if (node.type.name !== this.name) return;

							const table = resolveTableElement(view, pos);
							if (!table) return;
							table.classList.toggle('is-readonly', !isEditable);

							const scrollable = table.parentElement;
							const shadowRight = !!(
								scrollable instanceof HTMLElement && scrollable.scrollWidth > scrollable.clientWidth
							);
							if (shadowRight)
								decorations.push(
									Decoration.widget(pos + 1, () => {
										const shadow = document.createElement('div');
										shadow.className = `scrollable-shadow right ${isEditable ? 'is-editable' : ''}`;
										return shadow;
									})
								);
						});

						return DecorationSet.create(doc, decorations);
					}
				}
			})
		];
	},

	addKeyboardShortcuts() {
		return {
			Tab: () => {
				if (this.editor.commands.goToNextCell()) {
					return true;
				}

				if (!this.editor.can().addRowAfter()) {
					return false;
				}

				return this.editor.chain().addRowAfter().goToNextCell().run();
			},
			'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
			Backspace: deleteTable,
			'Mod-Backspace': deleteTable,
			Delete: deleteTable,
			'Mod-Delete': deleteTable
		};
	}
}).configure({ resizable: true, lastColumnResizable: false });
