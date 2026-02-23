import type { CommandProps, Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, NodeType } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';

type ReplaceTarget = {
	from: number;
	to: number;
	text: string;
};

const pushUniqueTarget = (
	targets: ReplaceTarget[],
	from: number,
	to: number,
	text: string
) => {
	if (targets.some((target) => target.from === from && target.to === to)) return;
	targets.push({ from, to, text });
};

const collectMathTargets = (state: CommandProps['state'], mathInline: NodeType) => {
	const targets: ReplaceTarget[] = [];
	const { selection } = state;

	if (selection instanceof NodeSelection && selection.node.type === mathInline) {
		pushUniqueTarget(targets, selection.from, selection.to, selection.node.textContent);
	}

	if (selection.$from.parent.type === mathInline) {
		const depth = selection.$from.depth;
		const from = selection.$from.before(depth);
		const to = selection.$from.after(depth);
		pushUniqueTarget(targets, from, to, selection.$from.parent.textContent);
	}

	state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, position: number) => {
		if (node.type !== mathInline) return;
		pushUniqueTarget(targets, position, position + node.nodeSize, node.textContent);
		return false;
	});

	return targets;
};

const unwrapMath = ({ state, tr }: CommandProps, mathInline: NodeType) => {
	const targets = collectMathTargets(state, mathInline);
	if (!targets.length) return false;

	for (const { from, to, text } of targets.sort((a, b) => b.from - a.from)) {
		if (!text.length) {
			tr.delete(from, to);
			continue;
		}

		tr.replaceWith(from, to, state.schema.text(text));
	}

	return true;
};

const wrapSelectionAsMath = ({ state, tr }: CommandProps, mathInline: NodeType) => {
	const { selection } = state;
	if (selection.empty) return false;

	const targets: ReplaceTarget[] = [];
	state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, position: number) => {
		if (!node.isTextblock) return;

		const contentFrom = position + 1;
		const contentTo = position + node.nodeSize - 1;
		const from = Math.max(selection.from, contentFrom);
		const to = Math.min(selection.to, contentTo);
		if (from >= to) return;

		const text = state.doc.textBetween(from, to, '');
		if (!text.length) return;

		targets.push({ from, to, text });
	});

	if (!targets.length) return false;

	for (const { from, to, text } of targets.sort((a, b) => b.from - a.from)) {
		const newNode = mathInline.create(null, state.schema.text(text));
		tr.replaceWith(from, to, newNode);
	}

	return true;
};

export default function setMath(tiptap: Editor) {
	tiptap
		.chain()
		.command((props: CommandProps) => {
			const mathInline = props.state.schema.nodes.math_inline;
			if (!mathInline || props.state.selection.empty) return false;

			if (unwrapMath(props, mathInline)) return true;
			return wrapSelectionAsMath(props, mathInline);
		})
		.run();
}
