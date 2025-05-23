import { canJoin } from 'prosemirror-transform';
import { getNodeType, findParentNode, isList } from '@tiptap/core';
import type { Transaction } from 'prosemirror-state';
import type { NodeType } from 'prosemirror-model';

const joinListBackwards = (tr: Transaction, listType: NodeType): boolean => {
	const list = findParentNode((node) => node.type === listType)(tr.selection);
	if (!list) return true;

	const before = tr.doc.resolve(Math.max(0, list.pos - 1)).before(list.depth);
	if (before === undefined) return true;

	const nodeBefore = tr.doc.nodeAt(before);
	const canJoinBackwards = list.node.type === nodeBefore?.type && canJoin(tr.doc, list.pos);
	if (!canJoinBackwards) return true;

	tr.join(list.pos);
	return true;
};

const joinListForwards = (tr: Transaction, listType: NodeType): boolean => {
	const list = findParentNode((node) => node.type === listType)(tr.selection);
	if (!list) return true;

	const after = tr.doc.resolve(list.start).after(list.depth);
	if (after === undefined) return true;

	const nodeAfter = tr.doc.nodeAt(after);
	const canJoinForwards = list.node.type === nodeAfter?.type && canJoin(tr.doc, after);
	if (!canJoinForwards) return true;

	tr.join(after);
	return true;
};

export default (listTypeOrName: string, itemTypeOrName: string, attrs: any) =>
	({ editor, tr, state, dispatch, chain, commands, can }: any) => {
		const { extensions } = editor.extensionManager;
		const listType = getNodeType(listTypeOrName, state.schema);
		const itemType = getNodeType(itemTypeOrName, state.schema);
		const { selection } = state;
		const { $from, $to } = selection;
		const range = $from.blockRange($to);

		if (!range) return false;
		const parentList = findParentNode((node) => isList(node.type.name, extensions))(selection);

		if (range.depth >= 1 && parentList && range.depth - parentList.depth <= 1) {
			if (parentList.node.type === listType && parentList?.node?.attrs?.type === attrs?.type)
				return commands.liftListItem(itemType);
			if (
				isList(parentList.node.type.name, extensions) &&
				listType.validContent(parentList.node.content) &&
				dispatch
			)
				return chain()
					.command(() => {
						tr.setNodeMarkup(parentList.pos, listType, attrs);
						return true;
					})
					.command(() => joinListBackwards(tr, listType))
					.command(() => joinListForwards(tr, listType))
					.run();
		}

		return chain()
			.command(() => {
				const canWrapInList = can().wrapInList(listType, attrs);
				if (canWrapInList) return true;
				return commands.clearNodes();
			})
			.wrapInList(listType, attrs)
			.command(() => joinListBackwards(tr, listType))
			.command(() => joinListForwards(tr, listType))
			.run();
	};
