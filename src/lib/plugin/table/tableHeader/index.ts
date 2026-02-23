import { TableHeader as BuiltInTableHeader } from '@tiptap/extension-table-header';
import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { getCellsInRow, isColumnSelected, selectColumn } from '../util';

export default BuiltInTableHeader.extend({
	addAttributes() {
		return {
			colspan: { default: 1 },
			rowspan: { default: 1 },
			colwidth: {
				default: null,
				parseHTML: (element) => {
					const colwidth = element.getAttribute('colwidth');
					return colwidth ? colwidth.split(',').map((item) => parseInt(item, 10)) : null;
				}
			},
			style: { default: null }
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					decorations: (state) => {
						if (!this.editor.isEditable) return DecorationSet.empty;

						const { doc, selection } = state;
						const decorations: Decoration[] = [];
						const cells = getCellsInRow(0)(selection);

						if (cells) {
							cells.forEach(({ pos }, index) => {
								decorations.push(
									Decoration.widget(pos + 1, () => {
										const colSelected = isColumnSelected(index)(selection);
										let className = 'grip-column';
										if (colSelected) className += ' selected';
										if (index === 0) className += ' first';
										else if (index === cells.length - 1) className += ' last';
										const grip = document.createElement('a');
										grip.className = className;
										grip.addEventListener('mousedown', (event) => {
											event.preventDefault();
											event.stopImmediatePropagation();
											this.editor.view.dispatch(selectColumn(index)(this.editor.state.tr));
										});
										return grip;
									})
								);
							});
						}

						return DecorationSet.create(doc, decorations);
					}
				}
			})
		];
	}
});
