import BuiltInTable from '@tiptap/extension-table';
import { Plugin } from 'prosemirror-state';
import { tableEditing, columnResizing } from 'prosemirror-tables';
import { Decoration, DecorationSet } from 'prosemirror-view';
import deleteTable from './deleteTable';

import './style.css';

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
		const { isEditable } = this.editor;

		return [
			tableEditing(),
			columnResizing({}),
			new Plugin({
				props: {
					decorations: (state) => {
						const { doc } = state;
						const decorations: Decoration[] = [];
						let index = 0;

						doc.descendants((node, pos) => {
							if (node.type.name !== this.name) return;

							const elements = document.getElementsByClassName('as-table');
							const table = elements[index];

							if (!table) return;
							if (!isEditable) table.classList.add('is-readonly');

							const element = table.parentElement;
							const shadowRight = !!(element && element.scrollWidth > element.clientWidth);
							if (shadowRight)
								decorations.push(
									Decoration.widget(pos + 1, () => {
										const shadow = document.createElement('div');
										shadow.className = `scrollable-shadow right ${isEditable ? 'is-editable' : ''}`;
										return shadow;
									})
								);
							index++;
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
