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
const horizontalAlignValues = ['left', 'center', 'right'] as const;
type HorizontalAlign = (typeof horizontalAlignValues)[number];
const horizontalAlignOptions = [
	{ label: 'Auto', value: null },
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' }
] as const;
const widthPresetOptions = [
	{ label: '100%', value: '100%' },
	{ label: '50%', value: '50%' }
] as const;
type WidthPreset = (typeof widthPresetOptions)[number]['value'];

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

function normalizeHorizontalAlignAttr(value: unknown): HorizontalAlign | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return null;
	return horizontalAlignValues.includes(normalized as HorizontalAlign)
		? (normalized as HorizontalAlign)
		: null;
}

function normalizeWidthPreset(value: unknown): WidthPreset | null {
	if (typeof value !== 'string' && typeof value !== 'number') return null;
	const normalized = String(value).trim();
	if (!normalized) return null;
	if (normalized === '100' || normalized === '100%') return '100%';
	if (normalized === '50' || normalized === '50%') return '50%';
	return null;
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

	if (kind === 'iframe') {
		if (aspectRatio) {
			// A fixed height prevents CSS aspect-ratio from taking effect.
			return { ...attrs, width: attrs.width || '100%', height: null, aspectRatio };
		}
		return { ...attrs, width: attrs.width || '100%', height: roundedHeight, aspectRatio: null };
	}

	if (kind === 'embed') {
		if (aspectRatio) {
			// Keep PDF/embed responsive with CSS aspect-ratio when a preset is selected.
			return { ...attrs, width: attrs.width || '100%', height: null, aspectRatio };
		}
		return { ...attrs, width: attrs.width || '100%', height: roundedHeight, aspectRatio: null };
	}

	return { ...attrs, height: roundedHeight, aspectRatio: null };
}

function canUseAspectRatioPreset(kind: ResizeKind) {
	return kind === 'iframe' || kind === 'embed';
}

function canUseLayoutOptions(kind: ResizeKind) {
	return kind === 'image' || canUseAspectRatioPreset(kind);
}

type ToolbarGroup = 'aspect' | 'align' | 'width';

function createToolbarGroupIcon(group: ToolbarGroup) {
	const icon = document.createElement('span');
	icon.className = 'tiptap-media-toolbar-group-icon';
	icon.dataset.group = group;
	icon.setAttribute('aria-hidden', 'true');
	return icon;
}

function createResizeHandleDecoration(
	nodePos: number,
	widgetPos: number,
	resizeMeta: ResizeMeta,
	node: ProseMirrorNode
) {
	const widthKey = normalizeWidthAttr(node.attrs.width) || 'auto';
	const aspectRatioKey = normalizeAspectRatioAttr(node.attrs.aspectRatio) || 'auto';
	const horizontalAlignKey = normalizeHorizontalAlignAttr(node.attrs.horizontalAlign) || 'auto';
	return Decoration.widget(
		widgetPos,
		() => {
			const anchor = document.createElement('div');
			anchor.className = 'tiptap-media-resize-anchor';
			const isImageAnchor = resizeMeta.kind === 'image';
			let controlsContainer: HTMLElement = anchor;
			if (isImageAnchor) {
				anchor.classList.add('is-image-anchor');
				const controls = document.createElement('div');
				controls.className = 'tiptap-media-resize-controls';
				controls.style.left = '0px';
				controls.style.width = '100%';
				anchor.append(controls);
				controlsContainer = controls;
			} else {
				const normalizedWidth = normalizeWidthAttr(node.attrs.width);
				if (normalizedWidth) {
					if (normalizedWidth.endsWith('%')) {
						anchor.style.width = normalizedWidth;
					} else {
						const numericWidth = parseNumericSize(normalizedWidth);
						if (numericWidth !== null) {
							anchor.style.width = `${Math.round(numericWidth)}px`;
						}
					}
					anchor.style.maxWidth = '100%';
				}
				const horizontalAlign = normalizeHorizontalAlignAttr(node.attrs.horizontalAlign);
				if (horizontalAlign === 'center') {
					anchor.style.marginLeft = 'auto';
					anchor.style.marginRight = 'auto';
				} else if (horizontalAlign === 'right') {
					anchor.style.marginLeft = 'auto';
					anchor.style.marginRight = '0';
				} else {
					anchor.style.marginLeft = '0';
					anchor.style.marginRight = '0';
				}
			}
			if (isImageAnchor) {
				requestAnimationFrame(() => {
					if (!anchor.isConnected) return;
					let candidate: Element | null = anchor.previousElementSibling;
					let imageElement: HTMLImageElement | null = null;
					while (candidate && !imageElement) {
						if (candidate instanceof HTMLImageElement) {
							imageElement = candidate;
						} else if (candidate instanceof HTMLElement) {
							imageElement = candidate.querySelector<HTMLImageElement>('img');
						}
						candidate = candidate.previousElementSibling;
					}
					if (!imageElement && anchor.parentElement instanceof HTMLElement) {
						imageElement =
							anchor.parentElement.querySelector<HTMLImageElement>(
								'figure.ProseMirror-selectednode img, img.ProseMirror-selectednode'
							) || null;
					}
					if (!(imageElement instanceof HTMLElement)) return;
					if (!(controlsContainer instanceof HTMLElement)) return;
					const rect = imageElement.getBoundingClientRect();
					if (rect.width <= 0 || rect.height <= 0) return;
					const anchorRect = anchor.getBoundingClientRect();
					const leftOffset = rect.left - anchorRect.left;
					const maxLeft = Math.max(0, anchorRect.width - rect.width);
					const clampedLeft = clamp(leftOffset, 0, maxLeft);
					const topOffset = rect.bottom - anchorRect.top + 6;
					controlsContainer.style.top = `${Math.round(topOffset)}px`;
					controlsContainer.style.left = `${Math.round(clampedLeft)}px`;
					controlsContainer.style.width = `${Math.round(rect.width)}px`;
				});
			}

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'tiptap-media-resize-handle';
			button.dataset.resizePos = String(nodePos);
			button.dataset.resizeKind = resizeMeta.kind;
			button.setAttribute(
				'aria-label',
				canUseLayoutOptions(resizeMeta.kind)
					? 'Resize media height (click for layout options)'
					: 'Resize media height'
			);
			controlsContainer.append(button);

			if (canUseLayoutOptions(resizeMeta.kind)) {
				const selectedAspectRatio = normalizeAspectRatioAttr(node.attrs.aspectRatio);
				const selectedHorizontalAlign = normalizeHorizontalAlignAttr(node.attrs.horizontalAlign);
				const selectedWidthPreset = normalizeWidthPreset(node.attrs.width);
				const supportsAspectRatio = canUseAspectRatioPreset(resizeMeta.kind);
				const supportsBottomWidthPreset = resizeMeta.kind === 'image';

				if (supportsAspectRatio) {
					const widthHandle = document.createElement('button');
					widthHandle.type = 'button';
					widthHandle.className = 'tiptap-media-width-resize-handle';
					widthHandle.dataset.resizePos = String(nodePos);
					widthHandle.dataset.resizeKind = resizeMeta.kind;
					widthHandle.setAttribute('aria-label', 'Resize media width (click for width presets)');
					controlsContainer.append(widthHandle);
				}

				const toolbar = document.createElement('div');
				toolbar.className = 'tiptap-media-aspect-ratio-toolbar';
				toolbar.setAttribute('role', 'toolbar');
				toolbar.setAttribute('aria-label', 'Media resize options');
				toolbar.dataset.resizePos = String(nodePos);
				let hasToolbarItems = false;

				if (supportsAspectRatio) {
					toolbar.append(createToolbarGroupIcon('aspect'));
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
					hasToolbarItems = true;
				}

				if (hasToolbarItems) {
					const separator = document.createElement('span');
					separator.className = 'tiptap-media-toolbar-separator';
					separator.setAttribute('aria-hidden', 'true');
					toolbar.append(separator);
				}

				toolbar.append(createToolbarGroupIcon('align'));
				for (const option of horizontalAlignOptions) {
					const optionButton = document.createElement('button');
					optionButton.type = 'button';
					optionButton.className = 'tiptap-media-horizontal-align-option';
					optionButton.dataset.resizePos = String(nodePos);
					optionButton.dataset.horizontalAlign = option.value ?? 'auto';
					optionButton.textContent = option.label;
					const isActive = option.value
						? option.value === selectedHorizontalAlign
						: !selectedHorizontalAlign;
					optionButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');
					toolbar.append(optionButton);
				}
				hasToolbarItems = true;

				if (supportsBottomWidthPreset) {
					const separator = document.createElement('span');
					separator.className = 'tiptap-media-toolbar-separator';
					separator.setAttribute('aria-hidden', 'true');
					toolbar.append(separator);
					toolbar.append(createToolbarGroupIcon('width'));
					for (const option of widthPresetOptions) {
						const optionButton = document.createElement('button');
						optionButton.type = 'button';
						optionButton.className = 'tiptap-media-width-option';
						optionButton.dataset.resizePos = String(nodePos);
						optionButton.dataset.widthPreset = option.value;
						optionButton.textContent = option.label;
						optionButton.setAttribute(
							'aria-pressed',
							selectedWidthPreset === option.value ? 'true' : 'false'
						);
						toolbar.append(optionButton);
					}
				}
				controlsContainer.append(toolbar);

				if (supportsAspectRatio) {
					const widthToolbar = document.createElement('div');
					widthToolbar.className = 'tiptap-media-width-toolbar';
					widthToolbar.setAttribute('role', 'toolbar');
					widthToolbar.setAttribute('aria-label', 'Media width presets');
					widthToolbar.dataset.resizePos = String(nodePos);
					widthToolbar.append(createToolbarGroupIcon('width'));
					for (const option of widthPresetOptions) {
						const optionButton = document.createElement('button');
						optionButton.type = 'button';
						optionButton.className = 'tiptap-media-width-option';
						optionButton.dataset.resizePos = String(nodePos);
						optionButton.dataset.widthPreset = option.value;
						optionButton.textContent = option.label;
						optionButton.setAttribute(
							'aria-pressed',
							selectedWidthPreset === option.value ? 'true' : 'false'
						);
						widthToolbar.append(optionButton);
					}
					controlsContainer.append(widthToolbar);
				}
			}

			return anchor;
		},
		{
			side: 1,
			key: `media-resize-${nodePos}-${resizeMeta.typeName}-${resizeMeta.kind}-${widthKey}-${aspectRatioKey}-${horizontalAlignKey}`
		}
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
						parseHTML: (element) => {
							const aspectRatio = normalizeAspectRatioAttr(
								element.getAttribute('data-resize-aspect-ratio')
							);
							if (aspectRatio) return null;
							return (
								normalizeNumericAttr(element.getAttribute('height') || element.style.height) ||
								'600'
							);
						},
						renderHTML: (attributes) => {
							const aspectRatio = normalizeAspectRatioAttr(attributes.aspectRatio);
							if (aspectRatio) return {};
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
					},
					horizontalAlign: {
						default: null,
						parseHTML: (element) =>
							normalizeHorizontalAlignAttr(element.getAttribute('data-resize-horizontal-align')),
						renderHTML: (attributes) => {
							const horizontalAlign = normalizeHorizontalAlignAttr(attributes.horizontalAlign);
							return horizontalAlign ? { 'data-resize-horizontal-align': horizontalAlign } : {};
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
				.querySelectorAll<HTMLElement>(
					'.tiptap-media-resize-anchor.is-toolbar-open, .tiptap-media-resize-anchor.is-width-toolbar-open'
				)
				.forEach((anchor) => {
					if (except && anchor === except) return;
					anchor.classList.remove('is-toolbar-open', 'is-width-toolbar-open');
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

							const widthOption = event.target.closest<HTMLElement>('.tiptap-media-width-option');
							if (widthOption) {
								event.preventDefault();
								event.stopPropagation();
								const pos = Number.parseInt(widthOption.dataset.resizePos || '', 10);
								if (!Number.isFinite(pos)) return true;
								const node = view.state.doc.nodeAt(pos);
								if (!node) return true;
								const resizeMeta = resolveResizeMeta(node);
								if (!resizeMeta || !canUseLayoutOptions(resizeMeta.kind)) return true;
								const widthPreset = normalizeWidthPreset(widthOption.dataset.widthPreset);
								if (!widthPreset) return true;
								if (node.attrs.width !== widthPreset) {
									view.dispatch(
										view.state.tr.setNodeMarkup(pos, node.type, {
											...node.attrs,
											width: widthPreset
										})
									);
								}
								closeOpenToolbars(view);
								return true;
							}

							const horizontalAlignOption = event.target.closest<HTMLElement>(
								'.tiptap-media-horizontal-align-option'
							);
							if (horizontalAlignOption) {
								event.preventDefault();
								event.stopPropagation();
								const pos = Number.parseInt(horizontalAlignOption.dataset.resizePos || '', 10);
								if (!Number.isFinite(pos)) return true;
								const node = view.state.doc.nodeAt(pos);
								if (!node) return true;
								const resizeMeta = resolveResizeMeta(node);
								if (!resizeMeta || !canUseLayoutOptions(resizeMeta.kind)) return true;
								const selectedHorizontalAlign =
									horizontalAlignOption.dataset.horizontalAlign || 'auto';
								const normalizedHorizontalAlign =
									selectedHorizontalAlign === 'auto'
										? null
										: normalizeHorizontalAlignAttr(selectedHorizontalAlign);
								if (selectedHorizontalAlign !== 'auto' && !normalizedHorizontalAlign) return true;
								const currentHorizontalAlign = normalizeHorizontalAlignAttr(
									node.attrs.horizontalAlign
								);
								if (normalizedHorizontalAlign !== currentHorizontalAlign) {
									view.dispatch(
										view.state.tr.setNodeMarkup(pos, node.type, {
											...node.attrs,
											horizontalAlign: normalizedHorizontalAlign
										})
									);
								}
								closeOpenToolbars(view);
								return true;
							}

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
								if (!resizeMeta || !canUseAspectRatioPreset(resizeMeta.kind)) return true;
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

							const widthHandle = event.target.closest<HTMLElement>(
								'.tiptap-media-width-resize-handle'
							);
							if (widthHandle) {
								const pos = Number.parseInt(widthHandle.dataset.resizePos || '', 10);
								if (!Number.isFinite(pos)) return false;

								const node = view.state.doc.nodeAt(pos);
								if (!node) return false;

								const resizeMeta = resolveResizeMeta(node);
								if (!resizeMeta || !canUseAspectRatioPreset(resizeMeta.kind)) return false;

								const resizeKind = widthHandle.dataset.resizeKind;
								if (resizeKind && resizeMeta.kind !== resizeKind) return false;

								const target = resolveTargetElement(view, pos, resizeMeta, node);
								if (!target) return false;

								event.preventDefault();
								event.stopPropagation();

								const anchor = widthHandle.closest<HTMLElement>('.tiptap-media-resize-anchor');
								const startX = event.clientX;
								const startY = event.clientY;
								const startHeight = resolveStartHeight(resizeMeta.kind, node, target);
								const targetParent = target.parentElement;
								const shouldShowProxy = resizeMeta.kind !== 'image' && Boolean(targetParent);
								const currentHorizontalAlign = normalizeHorizontalAlignAttr(
									node.attrs.horizontalAlign
								);
								const startWidth = Math.max(
									1,
									resolveElementWidth(node, target) ||
										targetParent?.getBoundingClientRect().width ||
										0
								);
								let frame = 0;
								let pendingWidth = startWidth;
								let resizeProxy: HTMLDivElement | null = null;
								let restoreTarget: (() => void) | null = null;
								let isDragging = false;
								let appliedDragCursor = false;
								const previousCursor = document.body.style.cursor;
								const previousSelect = document.body.style.userSelect;

								const dispatchWidth = (width: number) => {
									const current = view.state.doc.nodeAt(pos);
									if (!current || current.type.name !== resizeMeta.typeName) return;

									const currentMeta = resolveResizeMeta(current);
									if (!currentMeta || !canUseAspectRatioPreset(currentMeta.kind)) return;

									const containerWidth = target.parentElement?.getBoundingClientRect().width || 0;
									const nextWidth =
										containerWidth > 0
											? `${Math.round(clamp((width / containerWidth) * 100, 10, 100))}%`
											: String(Math.max(1, Math.round(width)));
									if (nextWidth === current.attrs.width) return;

									view.dispatch(
										view.state.tr.setNodeMarkup(pos, current.type, {
											...current.attrs,
											width: nextWidth
										})
									);
								};

								const beginDrag = () => {
									if (isDragging) return;
									isDragging = true;
									closeOpenToolbars(view);
									if (shouldShowProxy && targetParent) {
										const targetElement = target;
										const originalDisplay = targetElement.style.display;
										resizeProxy = document.createElement('div');
										resizeProxy.className = 'tiptap-media-resize-proxy';
										resizeProxy.style.height = `${Math.round(startHeight)}px`;
										resizeProxy.style.width = `${Math.round(startWidth)}px`;
										if (currentHorizontalAlign === 'center') {
											resizeProxy.style.marginLeft = 'auto';
											resizeProxy.style.marginRight = 'auto';
										} else if (currentHorizontalAlign === 'right') {
											resizeProxy.style.marginLeft = 'auto';
											resizeProxy.style.marginRight = '0';
										} else {
											resizeProxy.style.marginLeft = '0';
											resizeProxy.style.marginRight = '0';
										}
										targetParent.insertBefore(resizeProxy, targetElement);
										targetElement.style.display = 'none';
										restoreTarget = () => {
											targetElement.style.display = originalDisplay;
											resizeProxy?.remove();
											resizeProxy = null;
											restoreTarget = null;
										};
									}
									document.body.style.cursor = 'ew-resize';
									document.body.style.userSelect = 'none';
									appliedDragCursor = true;
								};

								const onMove = (moveEvent: MouseEvent) => {
									const deltaX = moveEvent.clientX - startX;
									const deltaY = moveEvent.clientY - startY;
									if (!isDragging && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 4) return;
									if (!isDragging) beginDrag();
									const containerWidth = target.parentElement?.getBoundingClientRect().width || 0;
									const minWidth = containerWidth > 0 ? Math.max(120, containerWidth * 0.2) : 120;
									const maxWidth = containerWidth > 0 ? containerWidth : maxHeight;
									const nextWidth = clamp(startWidth + deltaX, minWidth, maxWidth);
									pendingWidth = nextWidth;
									if (resizeProxy) resizeProxy.style.width = `${Math.round(nextWidth)}px`;
									if (shouldShowProxy) return;
									if (frame) cancelAnimationFrame(frame);
									frame = requestAnimationFrame(() => dispatchWidth(nextWidth));
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
											Boolean(anchor) &&
											!(anchor?.classList.contains('is-width-toolbar-open') ?? false);
										closeOpenToolbars(view, shouldOpen && anchor ? anchor : null);
										if (shouldOpen) anchor?.classList.remove('is-toolbar-open');
										anchor?.classList.toggle('is-width-toolbar-open', shouldOpen);
										cleanup();
										return;
									}
									if (shouldShowProxy) dispatchWidth(pendingWidth);
									cleanup();
								};

								removeDragListeners?.();
								window.addEventListener('mousemove', onMove);
								window.addEventListener('mouseup', onUp);
								removeDragListeners = cleanup;

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
							const shouldShowProxy = true;
							const currentHorizontalAlign = normalizeHorizontalAlignAttr(
								node.attrs.horizontalAlign
							);
							const startWidth = resolveElementWidth(node, target);
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
									if (startWidth > 0) {
										resizeProxy.style.width = `${Math.round(startWidth)}px`;
									}
									if (currentHorizontalAlign === 'center') {
										resizeProxy.style.marginLeft = 'auto';
										resizeProxy.style.marginRight = 'auto';
									} else if (currentHorizontalAlign === 'right') {
										resizeProxy.style.marginLeft = 'auto';
										resizeProxy.style.marginRight = '0';
									} else {
										resizeProxy.style.marginLeft = '0';
										resizeProxy.style.marginRight = '0';
									}
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
									if (shouldOpen) anchor?.classList.remove('is-width-toolbar-open');
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
