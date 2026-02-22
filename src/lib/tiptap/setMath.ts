import type { CommandProps, Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export default function setMath(tiptap: Editor) {
	const { selection } = tiptap.state;
	tiptap
		.chain()
		.command(({ state, tr }) =>
			state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
				if (!node.isTextblock || selection.from === selection.to) return;

				const startPosition = Math.max(position + 1, selection.from);
				const endPosition = Math.min(position + node.nodeSize, selection.to);

				const substringFrom = Math.max(0, selection.from - position - 1);
				const substringTo = Math.max(0, selection.to - position - 1);
				const updatedText = node.textContent.substring(substringFrom, substringTo);
				const newNode = state.schema.nodes.math_inline.create(null, state.schema.text(updatedText));

				tr = tr.replaceWith(startPosition, endPosition, newNode);
			})
		)
		.run();
}
