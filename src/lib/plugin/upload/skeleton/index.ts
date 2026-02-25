import { Node, mergeAttributes, type Editor, type JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import UploadSkeleton from './UploadSkeleton.svelte';

export const UPLOAD_SKELETON_NODE = 'tiptap-upload-skeleton';

const defaultHeight = {
	image: 220,
	file: 56,
	pdf: 420,
	embed: 420,
	block: 180
} as const;

type UploadSkeletonKind = keyof typeof defaultHeight;
type InsertUploadSkeletonOptions = {
	kind?: UploadSkeletonKind;
	height?: number;
	at?: number;
	select?: boolean;
	insertParagraph?: boolean;
};
type ReplaceOptions = {
	select?: boolean;
};
type EditorLike = Pick<Editor, 'state' | 'view'>;

export type UploadSkeletonHandle = {
	id: string;
	exists: () => boolean;
	replaceWith: (content: JSONContent, options?: ReplaceOptions) => boolean;
	remove: () => boolean;
};

function findUploadSkeleton(doc: ProseMirrorNode, id: string) {
	let foundPos: number | null = null;
	let foundNode: ProseMirrorNode | null = null;

	doc.descendants((node, pos) => {
		if (node.type.name !== UPLOAD_SKELETON_NODE) return;
		if (node.attrs.uploadId !== id) return;
		foundPos = pos;
		foundNode = node;
		return false;
	});

	if (foundPos === null || foundNode === null) return null;
	return { pos: foundPos, node: foundNode };
}

function tryCreateNodeSelection(doc: ProseMirrorNode, pos: number) {
	if (pos < 0 || pos > doc.content.size) return null;
	const node = doc.nodeAt(pos);
	if (!node || node.type.spec.selectable === false) return null;
	try {
		return NodeSelection.create(doc, pos);
	} catch {
		return null;
	}
}

export function insertUploadSkeleton(
	editor: EditorLike,
	{
		kind = 'block',
		height = defaultHeight[kind],
		at,
		select = true,
		insertParagraph = true
	}: InsertUploadSkeletonOptions = {}
): UploadSkeletonHandle | null {
	const skeletonType = editor.state.schema.nodes[UPLOAD_SKELETON_NODE];
	if (!skeletonType) return null;

	const clampedHeight = Math.max(44, Math.min(1200, Math.round(height)));
	const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	const node = skeletonType.create({ uploadId, kind, height: clampedHeight });
	const paragraph = editor.state.schema.nodes.paragraph?.create();
	const safePos = Math.max(0, Math.min(at ?? editor.state.selection.from, editor.state.doc.content.size));
	const tr = editor.state.tr.insert(safePos, node);

	if (insertParagraph && paragraph) {
		tr.insert(safePos + node.nodeSize, paragraph);
	}

	if (select) {
		const nodeSelection = tryCreateNodeSelection(tr.doc, safePos);
		if (nodeSelection) tr.setSelection(nodeSelection);
	}

	editor.view.dispatch(tr);

	return {
		id: uploadId,
		exists: () => Boolean(findUploadSkeleton(editor.state.doc, uploadId)),
		replaceWith: (content: JSONContent, options: ReplaceOptions = {}) => {
			const target = findUploadSkeleton(editor.state.doc, uploadId);
			if (!target) return false;
			if (!content?.type) return false;

			let nextNode: ProseMirrorNode;
			try {
				nextNode = editor.state.schema.nodeFromJSON(content as any);
			} catch {
				return false;
			}

			const tr = editor.state.tr.replaceWith(
				target.pos,
				target.pos + target.node.nodeSize,
				nextNode
			);
			if (options.select ?? true) {
				const nodeSelection = tryCreateNodeSelection(tr.doc, target.pos);
				if (nodeSelection) tr.setSelection(nodeSelection);
			}
			editor.view.dispatch(tr);
			return true;
		},
		remove: () => {
			const target = findUploadSkeleton(editor.state.doc, uploadId);
			if (!target) return false;

			const removeFrom = target.pos;
			let removeTo = target.pos + target.node.nodeSize;
			const nextNode = editor.state.doc.nodeAt(removeTo);
			if (nextNode?.type.name === 'paragraph' && nextNode.content.size === 0) {
				removeTo += nextNode.nodeSize;
			}

			editor.view.dispatch(editor.state.tr.deleteRange(removeFrom, removeTo));
			return true;
		}
	};
}

export default Node.create({
	name: UPLOAD_SKELETON_NODE,
	group: 'block',
	atom: true,
	draggable: false,
	selectable: true,

	addAttributes() {
		return {
			uploadId: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-upload-id'),
				renderHTML: (attributes) =>
					attributes.uploadId ? { 'data-upload-id': attributes.uploadId } : {}
			},
			kind: {
				default: 'block',
				parseHTML: (element) => element.getAttribute('data-upload-kind') || 'block',
				renderHTML: (attributes) =>
					attributes.kind ? { 'data-upload-kind': attributes.kind } : {}
			},
			height: {
				default: defaultHeight.block,
				parseHTML: (element) => {
					const value = Number.parseInt(element.getAttribute('data-upload-height') || '', 10);
					return Number.isFinite(value) ? value : defaultHeight.block;
				},
				renderHTML: (attributes) => {
					const raw = Number.parseFloat(String(attributes.height ?? defaultHeight.block));
					const height = Number.isFinite(raw) ? Math.max(44, Math.min(1200, Math.round(raw))) : 180;
					return { 'data-upload-height': String(height) };
				}
			}
		};
	},

	parseHTML() {
		return [{ tag: UPLOAD_SKELETON_NODE }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			UPLOAD_SKELETON_NODE,
			mergeAttributes(HTMLAttributes, {
				'data-bubble-menu': 'false'
			})
		];
	},

	addNodeView() {
		return SvelteNodeViewRenderer(UploadSkeleton);
	}
});
