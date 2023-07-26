import {isColumnSelected, isTableSelected} from "./util";
import type {KeyboardShortcutCommand} from "@tiptap/core";
import {TableMap} from "prosemirror-tables";

export const deleteTable: KeyboardShortcutCommand = ({editor}) => {
    const {selection} = editor.state;
    if (!selection || !(<any>selection).$anchorCell) return false;
    if (isTableSelected(selection)) return editor.commands.deleteTable()
    const {height, width} = TableMap.get((<any>selection).$anchorCell.node(-1));
    for (let i = width - 1; i >= 0; i--) {
        if (isColumnSelected(i)(selection)) {
            editor.commands.deleteColumn();
            return true;
        }
    }
    for (let i = height - 1; i >= 0; i--) {
        if (isColumnSelected(i)(selection)) {
            editor.commands.deleteRow();
            return true;
        }
    }
    return false;
}

export default deleteTable;