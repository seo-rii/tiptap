import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

const resizableTypes = ['image', 'iframe', 'embed', 'tiptap-midibus'] as const;
type ResizableType = (typeof resizableTypes)[number];
type ResizeKind = ResizableType | 'attr';
export type ResizeOptions = {
	attributeTypes: string[];
	showHandleAlways?: boolean;
	showHandleOnActive?: boolean;
};
type ResizeMeta = {
	kind: ResizeKind;
	typeName: string;
	minHeight: number;
	maxHeight: number;
};

const typeSet = new Set<string>(resizableTypes);
const pluginKey = new PluginKey('tiptap-media-height-resize');

const defaultHeight: Record<ResizeKind, number> = {
	image: 360,
	iframe: 600,
	embed: 500,
	'tiptap-midibus': 600,
	attr: 420
};

const minHeight: Record<ResizeKind, number> = {
	image: 120,
	iframe: 180,
	embed: 200,
	'tiptap-midibus': 220,
	attr: 160
};

const maxHeight = 1600;
const aspectRatioOptions = [
	{ label: 'Auto', value: null },
	{ label: '16:9', value: '16:9' },
	{ label: '3:2', value: '3:2' },
	{ label: '21:9', value: '21:9' },
	{ label: '1:1', value: '1:1' },
	{ label: '4:3', value: '4:3' },
	{ label: '9:16', value: '9:16' }
] as const;

function isResizableType(value: string): value is ResizableType {
	return typeSet.has(value);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function parseNumericSize(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const normalized = trimmed.toLowerCase().endsWith('px') ? trimmed.slice(0, -2) : trimmed;
	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseAspectRatio(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const ratioMatch = /^([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
	if (ratioMatch) {
		const widthPart = Number.parseFloat(ratioMatch[1]);
		const heightPart = Number.parseFloat(ratioMatch[2]);
		if (!Number.isFinite(widthPart) || !Number.isFinite(heightPart)) return null;
		if (widthPart <= 0 || heightPart <= 0) return null;
		return widthPart / heightPart;
	}
	const parsed = Number.parseFloat(trimmed);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

function formatDecimal(value: number, precision = 6) {
	return String(Number(value.toFixed(precision)));
}

function normalizeAspectRatioAttr(value: unknown): string | null {
	if (typeof value === 'number') {
		if (!Number.isFinite(value) || value <= 0) return null;
		return formatDecimal(value);
	}
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const ratioMatch = /^([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)$/.exec(trimmed);
	if (ratioMatch) {
		const widthPart = Number.parseFloat(ratioMatch[1]);
		const heightPart = Number.parseFloat(ratioMatch[2]);
		if (!Number.isFinite(widthPart) || !Number.isFinite(heightPart)) return null;
		if (widthPart <= 0 || heightPart <= 0) return null;
		return `${formatDecimal(widthPart, 4)}:${formatDecimal(heightPart, 4)}`;
	}
	const parsed = Number.parseFloat(trimmed);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return formatDecimal(parsed);
}

function sameAspectRatio(left: string | null, right: string | null) {
	if (!left && !right) return true;
	if (!left || !right) return false;
	const leftRatio = parseAspectRatio(left);
	const rightRatio = parseAspectRatio(right);
	if (leftRatio === null || rightRatio === null) return false;
	return Math.abs(leftRatio - rightRatio) <= 0.001;
}

function normalizeStringAttr(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
}

function hasResizeHandler(value: unknown) {
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (!normalized) return true;
		return !['false', '0', 'off', 'no'].includes(normalized);
	}
	return Boolean(value);
}

function normalizeNumericAttr(value: unknown): string | null {
	const parsed = parseNumericSize(value);
	if (parsed === null) return null;
	return String(Math.round(parsed));
}

function normalizeWidthAttr(value: unknown): string | null {
	if (typeof value === 'number') return String(Math.round(value));
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed.endsWith('%')) return trimmed;
	return normalizeNumericAttr(trimmed);
}

function resolveResizeMeta(node: ProseMirrorNode): ResizeMeta | null {
	const typeName = node.type.name;
	const kind: ResizeKind | null = isResizableType(typeName)
		? typeName
		: hasResizeHandler(node.attrs.resizeHandler)
			? 'attr'
			: null;
	if (!kind) return null;

	const minFromAttr = parseNumericSize(node.attrs.minHeight);
	const maxFromAttr = parseNumericSize(node.attrs.maxHeight);
	const resolvedMin = minFromAttr !== null ? Math.max(1, minFromAttr) : minHeight[kind];
	const resolvedMax = maxFromAttr !== null ? Math.max(resolvedMin, maxFromAttr) : maxHeight;

	return {
		kind,
		typeName,
		minHeight: resolvedMin,
		maxHeight: resolvedMax
	};
}

function resolveImageRatio(node: ProseMirrorNode, element: HTMLElement) {
	if (element instanceof HTMLImageElement && element.naturalWidth && element.naturalHeight) {
		return element.naturalWidth / element.naturalHeight;
	}

	const rect = element.getBoundingClientRect();
	if (rect.width > 0 && rect.height > 0) {
		return rect.width / rect.height;
	}

	const width = parseNumericSize(node.attrs.width);
	const height = parseNumericSize(node.attrs.height);
	if (width && height) return width / height;

	return 1;
}

function resolveStartHeight(kind: ResizeKind, node: ProseMirrorNode, element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	if (rect.height > 0) return rect.height;

	const fromAttr = parseNumericSize(node.attrs.height);
	if (fromAttr !== null) return fromAttr;

	return defaultHeight[kind];
}

function resolveElementWidth(node: ProseMirrorNode, element: HTMLElement) {
	const rect = element.getBoundingClientRect();
	if (rect.width > 0) return rect.width;
	const fromAttr = parseNumericSize(node.attrs.width);
	if (fromAttr !== null) return fromAttr;
	return 0;
}

function resolveTargetElement(
	view: EditorView,
	pos: number,
	resizeMeta: ResizeMeta,
	node: ProseMirrorNode
) {
	const nodeDom = view.nodeDOM(pos);
	if (!(nodeDom instanceof HTMLElement)) return null;

	if (resizeMeta.kind === 'image') {
		if (nodeDom instanceof HTMLImageElement) return nodeDom;
		return nodeDom.querySelector<HTMLImageElement>('img');
	}

	if (resizeMeta.kind === 'iframe') {
		if (nodeDom instanceof HTMLIFrameElement) return nodeDom;
		return nodeDom.querySelector<HTMLIFrameElement>('iframe');
	}

	if (resizeMeta.kind === 'embed') {
		return (
			nodeDom.querySelector<HTMLElement>('[data-tiptap-pdf-container]') ||
			nodeDom.querySelector<HTMLElement>('embed') ||
			nodeDom
		);
	}

	if (resizeMeta.kind === 'attr') {
		const preferredSelector = normalizeStringAttr(node.attrs.resizeTarget);
		if (preferredSelector) {
			try {
				const preferredTarget = nodeDom.querySelector<HTMLElement>(preferredSelector);
				if (preferredTarget) return preferredTarget;
			} catch {
				// ignore invalid selector values
			}
		}

		return (
			nodeDom.querySelector<HTMLElement>('[data-tiptap-resize-target]') ||
			nodeDom.querySelector<HTMLElement>('[data-resize-target]') ||
			nodeDom.querySelector<HTMLElement>('iframe, embed, img') ||
			nodeDom
		);
	}

	return (
		nodeDom.querySelector<HTMLElement>('[data-tiptap-midibus-frame]') ||
		nodeDom.querySelector<HTMLElement>('iframe') ||
		nodeDom
	);
}

function buildResizeAttrs(
	kind: ResizeKind,
	node: ProseMirrorNode,
	height: number,
	imageRatio: number,
	aspectRatio: string | null = normalizeAspectRatioAttr(node.attrs.aspectRatio)
) {
	const attrs = { ...node.attrs };
	const roundedHeight = String(Math.round(height));

	if (kind === 'image') {
		const roundedWidth = String(Math.max(1, Math.round(height * imageRatio)));
		// Keep image responsive by storing width only; fixed height causes ratio distortion on narrow layouts.
		return { ...attrs, width: roundedWidth, height: null };
	}

	if (kind === 'iframe' || kind === 'embed') {
		return { ...attrs, width: attrs.width || '100%', height: roundedHeight, aspectRatio };
	}

	return { ...attrs, height: roundedHeight, aspectRatio };
}

function createResizeHandleDecoration(
	nodePos: number,
	widgetPos: number,
	resizeMeta: ResizeMeta,
	node: ProseMirrorNode
) {
	return Decoration.widget(
		widgetPos,
		() => {
			const anchor = document.createElement('div');
			anchor.className = 'tiptap-media-resize-anchor';

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'tiptap-media-resize-handle';
			button.dataset.resizePos = String(nodePos);
			button.dataset.resizeKind = resizeMeta.kind;
			button.setAttribute('aria-label', 'Resize media height (click for aspect ratio)');
			anchor.append(button);

			if (resizeMeta.kind !== 'image') {
				const selectedAspectRatio = normalizeAspectRatioAttr(node.attrs.aspectRatio);
				const toolbar = document.createElement('div');
				toolbar.className = 'tiptap-media-aspect-ratio-toolbar';
				toolbar.setAttribute('role', 'toolbar');
				toolbar.setAttribute('aria-label', 'Aspect ratio presets');
				toolbar.dataset.resizePos = String(nodePos);
				for (const option of aspectRatioOptions) {
					const optionButton = document.createElement('button');
					optionButton.type = 'button';
					optionButton.className = 'tiptap-media-aspect-ratio-option';
					optionButton.dataset.resizePos = String(nodePos);
					optionButton.dataset.aspectRatio = option.value ?? 'auto';
					optionButton.textContent = option.label;
					const isActive = option.value
						? sameAspectRatio(option.value, selectedAspectRatio)
						: !selectedAspectRatio;
					optionButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');
					toolbar.append(optionButton);
				}
				anchor.append(toolbar);
			}

			return anchor;
		},
		{ side: 1, key: `media-resize-${nodePos}-${resizeMeta.typeName}-${resizeMeta.kind}` }
	);
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

export default Extension.create<ResizeOptions>({
	name: 'tiptap-media-height-resize',

	addOptions() {
		return {
			attributeTypes: [],
			showHandleAlways: true,
			showHandleOnActive: true
		};
	},

	addGlobalAttributes() {
		const attributeTypes = Array.from(
			new Set([...(this.options.attributeTypes || []), ...resizableTypes])
		);

		return [
			{
				types: ['image'],
				attributes: {
					width: {
						default: null,
						parseHTML: (element) =>
							normalizeWidthAttr(element.getAttribute('width') || element.style.width),
						renderHTML: (attributes) => {
							const width = normalizeWidthAttr(attributes.width);
							return width ? { width } : {};
						}
					},
					height: {
						default: null,
						parseHTML: (element) =>
							normalizeNumericAttr(element.getAttribute('height') || element.style.height),
						renderHTML: (attributes) => {
							const height = normalizeNumericAttr(attributes.height);
							return height ? { height } : {};
						}
					}
				}
			},
			{
				types: ['iframe'],
				attributes: {
					width: {
						default: '100%',
						parseHTML: (element) =>
							normalizeWidthAttr(element.getAttribute('width') || element.style.width) || '100%',
						renderHTML: (attributes) => {
							const width = normalizeWidthAttr(attributes.width) || '100%';
							return { width };
						}
					},
					height: {
						default: '600',
						parseHTML: (element) =>
							normalizeNumericAttr(element.getAttribute('height') || element.style.height) || '600',
						renderHTML: (attributes) => {
							const height = normalizeNumericAttr(attributes.height) || '600';
							return { height };
						}
					}
				}
			},
			{
				types: attributeTypes,
				attributes: {
					resizeHandler: {
						default: false,
						parseHTML: (element) =>
							hasResizeHandler(
								element.getAttribute('data-resize-handler') ||
									element.getAttribute('resize-handler')
							),
						renderHTML: (attributes) =>
							hasResizeHandler(attributes.resizeHandler) ? { 'data-resize-handler': 'true' } : {}
					},
					resizeTarget: {
						default: null,
						parseHTML: (element) => normalizeStringAttr(element.getAttribute('data-resize-target')),
						renderHTML: (attributes) => {
							const resizeTarget = normalizeStringAttr(attributes.resizeTarget);
							return resizeTarget ? { 'data-resize-target': resizeTarget } : {};
						}
					},
					minHeight: {
						default: null,
						parseHTML: (element) =>
							normalizeNumericAttr(element.getAttribute('data-resize-min-height')),
						renderHTML: (attributes) => {
							const minHeight = normalizeNumericAttr(attributes.minHeight);
							return minHeight ? { 'data-resize-min-height': minHeight } : {};
						}
					},
					maxHeight: {
						default: null,
						parseHTML: (element) =>
							normalizeNumericAttr(element.getAttribute('data-resize-max-height')),
						renderHTML: (attributes) => {
							const maxHeight = normalizeNumericAttr(attributes.maxHeight);
							return maxHeight ? { 'data-resize-max-height': maxHeight } : {};
						}
					},
					aspectRatio: {
						default: null,
						parseHTML: (element) =>
							normalizeAspectRatioAttr(element.getAttribute('data-resize-aspect-ratio')),
						renderHTML: (attributes) => {
							const aspectRatio = normalizeAspectRatioAttr(attributes.aspectRatio);
							return aspectRatio ? { 'data-resize-aspect-ratio': aspectRatio } : {};
						}
					}
				}
			}
		];
	},

	addProseMirrorPlugins() {
		let removeDragListeners: (() => void) | null = null;
		const closeOpenToolbars = (view: EditorView, except: HTMLElement | null = null) => {
			view.dom
				.querySelectorAll<HTMLElement>('.tiptap-media-resize-anchor.is-toolbar-open')
				.forEach((anchor) => {
					if (except && anchor === except) return;
					anchor.classList.remove('is-toolbar-open');
				});
		};

		return [
			new Plugin({
				key: pluginKey,
				appendTransaction: (transactions, _oldState, newState) => {
					if (!transactions.some((tr) => tr.docChanged)) return null;
					if (newState.selection instanceof NodeSelection) return null;

					const nodeBefore = newState.selection.$from.nodeBefore;
					if (!nodeBefore) return null;

					const resizeMeta = resolveResizeMeta(nodeBefore);
					if (!resizeMeta) return null;

					const typeName = nodeBefore.type.name;
					const nodePos = newState.selection.from - nodeBefore.nodeSize;
					if (nodePos < 0) return null;
					if (newState.doc.nodeAt(nodePos)?.type.name !== typeName) return null;

					const nodeSelection = tryCreateNodeSelection(newState.doc, nodePos);
					if (!nodeSelection) return null;
					return newState.tr.setSelection(nodeSelection);
				},
				props: {
					decorations: (state) => {
						if (!this.editor.isEditable) return DecorationSet.empty;
						const showHandleAlways = this.options.showHandleAlways !== false;
						const showHandleOnActive = this.options.showHandleOnActive !== false;
						if (!showHandleAlways && !showHandleOnActive) return DecorationSet.empty;

						const decorations: Decoration[] = [];
						const handled = new Set<number>();

						if (showHandleAlways) {
							state.doc.descendants((node, pos) => {
								const resizeMeta = resolveResizeMeta(node);
								if (!resizeMeta || resizeMeta.kind === 'image' || node.isInline) return;
								decorations.push(
									createResizeHandleDecoration(pos, pos + node.nodeSize, resizeMeta, node)
								);
								handled.add(pos);
							});
						}

						if (showHandleOnActive && state.selection instanceof NodeSelection) {
							const pos = state.selection.from;
							const resizeMeta = resolveResizeMeta(state.selection.node);
							if (resizeMeta && !handled.has(pos)) {
								decorations.push(
									createResizeHandleDecoration(
										pos,
										pos + state.selection.node.nodeSize,
										resizeMeta,
										state.selection.node
									)
								);
							}
						}

						if (!decorations.length) return DecorationSet.empty;
						return DecorationSet.create(state.doc, decorations);
					},
					handleDOMEvents: {
						mousedown: (view, event) => {
							if (!this.editor.isEditable) return false;
							if (!(event.target instanceof HTMLElement)) return false;

							const ratioOption = event.target.closest<HTMLElement>(
								'.tiptap-media-aspect-ratio-option'
							);
							if (ratioOption) {
								event.preventDefault();
								event.stopPropagation();
								const pos = Number.parseInt(ratioOption.dataset.resizePos || '', 10);
								if (!Number.isFinite(pos)) return true;
								const node = view.state.doc.nodeAt(pos);
								if (!node) return true;
								const resizeMeta = resolveResizeMeta(node);
								if (!resizeMeta || resizeMeta.kind === 'image') return true;
								const target = resolveTargetElement(view, pos, resizeMeta, node);
								if (!target) return true;
								const selectedRatio = ratioOption.dataset.aspectRatio || 'auto';
								const normalizedAspectRatio =
									selectedRatio === 'auto' ? null : normalizeAspectRatioAttr(selectedRatio);
								if (selectedRatio !== 'auto' && !normalizedAspectRatio) return true;

								let nextHeight = resolveStartHeight(resizeMeta.kind, node, target);
								const ratioValue = parseAspectRatio(normalizedAspectRatio);
								if (ratioValue !== null) {
									const width = resolveElementWidth(node, target);
									if (width > 0) {
										nextHeight = clamp(
											width / ratioValue,
											resizeMeta.minHeight,
											resizeMeta.maxHeight
										);
									}
								}

								const nextAttrs = buildResizeAttrs(
									resizeMeta.kind,
									node,
									nextHeight,
									1,
									normalizedAspectRatio
								);
								const nextWidth =
									'width' in nextAttrs ? nextAttrs.width : (node.attrs.width as string | undefined);
								const nextAspectRatio = 'aspectRatio' in nextAttrs ? nextAttrs.aspectRatio : null;
								if (
									nextAttrs.height !== node.attrs.height ||
									nextWidth !== node.attrs.width ||
									nextAspectRatio !== node.attrs.aspectRatio
								) {
									view.dispatch(view.state.tr.setNodeMarkup(pos, node.type, nextAttrs));
								}
								closeOpenToolbars(view);
								return true;
							}

							const handle = event.target.closest<HTMLElement>('.tiptap-media-resize-handle');
							if (!handle) {
								closeOpenToolbars(view);
								return false;
							}

							const pos = Number.parseInt(handle.dataset.resizePos || '', 10);
							if (!Number.isFinite(pos)) return false;

							const node = view.state.doc.nodeAt(pos);
							if (!node) return false;

							const resizeMeta = resolveResizeMeta(node);
							if (!resizeMeta) return false;

							const resizeKind = handle.dataset.resizeKind;
							if (resizeKind && resizeMeta.kind !== resizeKind) return false;

							const target = resolveTargetElement(view, pos, resizeMeta, node);
							if (!target) return false;

							event.preventDefault();
							event.stopPropagation();

							const anchor = handle.closest<HTMLElement>('.tiptap-media-resize-anchor');
							const startX = event.clientX;
							const startY = event.clientY;
							const startHeight = resolveStartHeight(resizeMeta.kind, node, target);
							const imageRatio = resizeMeta.kind === 'image' ? resolveImageRatio(node, target) : 1;
							const shouldShowProxy = resizeMeta.kind !== 'image';
							let resizeProxy: HTMLDivElement | null = null;
							let restoreTarget: (() => void) | null = null;
							let frame = 0;
							let pendingHeight = startHeight;
							let isDragging = false;
							let appliedDragCursor = false;
							const previousCursor = document.body.style.cursor;
							const previousSelect = document.body.style.userSelect;

							const dispatchHeight = (height: number) => {
								const current = view.state.doc.nodeAt(pos);
								if (!current || current.type.name !== resizeMeta.typeName) return;

								const currentMeta = resolveResizeMeta(current);
								if (!currentMeta) return;
								// Manual drag should unlock fixed aspect ratio.
								const aspectRatioForDrag = null;

								const nextAttrs = buildResizeAttrs(
									currentMeta.kind,
									current,
									height,
									imageRatio,
									aspectRatioForDrag
								);
								const nextWidth =
									'width' in nextAttrs
										? nextAttrs.width
										: (current.attrs.width as string | undefined);
								const nextAspectRatio = 'aspectRatio' in nextAttrs ? nextAttrs.aspectRatio : null;
								if (
									nextAttrs.height === current.attrs.height &&
									nextWidth === current.attrs.width &&
									nextAspectRatio === current.attrs.aspectRatio
								)
									return;

								view.dispatch(view.state.tr.setNodeMarkup(pos, current.type, nextAttrs));
							};

							const beginDrag = () => {
								if (isDragging) return;
								isDragging = true;
								closeOpenToolbars(view);
								if (shouldShowProxy && target.parentElement) {
									const targetElement = target;
									const originalDisplay = targetElement.style.display;
									resizeProxy = document.createElement('div');
									resizeProxy.className = 'tiptap-media-resize-proxy';
									resizeProxy.style.height = `${Math.round(startHeight)}px`;
									target.parentElement.insertBefore(resizeProxy, targetElement);
									targetElement.style.display = 'none';
									restoreTarget = () => {
										targetElement.style.display = originalDisplay;
										resizeProxy?.remove();
										resizeProxy = null;
										restoreTarget = null;
									};
								}
								document.body.style.cursor = 'ns-resize';
								document.body.style.userSelect = 'none';
								appliedDragCursor = true;
							};

							const onMove = (moveEvent: MouseEvent) => {
								const deltaX = moveEvent.clientX - startX;
								const deltaY = moveEvent.clientY - startY;
								if (!isDragging && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 4) return;
								if (!isDragging) beginDrag();
								const nextHeight = clamp(
									startHeight + deltaY,
									resizeMeta.minHeight,
									resizeMeta.maxHeight
								);
								pendingHeight = nextHeight;
								if (resizeProxy) resizeProxy.style.height = `${Math.round(nextHeight)}px`;
								if (shouldShowProxy) return;
								if (frame) cancelAnimationFrame(frame);
								frame = requestAnimationFrame(() => dispatchHeight(nextHeight));
							};

							const cleanup = () => {
								if (frame) cancelAnimationFrame(frame);
								window.removeEventListener('mousemove', onMove);
								window.removeEventListener('mouseup', onUp);
								if (appliedDragCursor) {
									document.body.style.cursor = previousCursor;
									document.body.style.userSelect = previousSelect;
								}
								restoreTarget?.();
								removeDragListeners = null;
							};

							const onUp = () => {
								if (!isDragging) {
									const shouldOpen =
										Boolean(anchor) && !(anchor?.classList.contains('is-toolbar-open') ?? false);
									closeOpenToolbars(view, shouldOpen && anchor ? anchor : null);
									anchor?.classList.toggle('is-toolbar-open', shouldOpen);
									cleanup();
									return;
								}
								if (shouldShowProxy) dispatchHeight(pendingHeight);
								cleanup();
							};

							removeDragListeners?.();
							window.addEventListener('mousemove', onMove);
							window.addEventListener('mouseup', onUp);
							removeDragListeners = cleanup;

							return true;
						}
					}
				},
				view: () => ({
					destroy: () => {
						removeDragListeners?.();
					}
				})
			})
		];
	}
});
