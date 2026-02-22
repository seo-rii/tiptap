import type { CommandProps, Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export default function setMath(tiptap: Editor) {
	const { selection } = tiptap.state;

	tiptap
		.chain()
		.command(({ state, tr }: CommandProps) => {
			if (selection.from === selection.to) return false;

			const mathInline = state.schema.nodes.math_inline;
			if (!mathInline) return false;

			state.doc.nodesBetween(selection.from, selection.to, (node: ProseMirrorNode, position: number) => {
				if (!node.isTextblock) return;

				const startPosition = Math.max(position + 1, selection.from);
				const endPosition = Math.min(position + node.nodeSize, selection.to);

				const substringFrom = Math.max(0, selection.from - position - 1);
				const substringTo = Math.max(0, selection.to - position - 1);
				const updatedText = node.textContent.substring(substringFrom, substringTo);
				const newNode = mathInline.create(null, state.schema.text(updatedText));

				tr.replaceWith(startPosition, endPosition, newNode);
			});

			return true;
		})
		.run();
}
