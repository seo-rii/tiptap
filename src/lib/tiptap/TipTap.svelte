<script lang="ts">
	import { setContext, untrack } from 'svelte';
	import sanitizeHtml from 'sanitize-html';
	import '@seorii/prosemirror-math/style.css';
	import Bubble from '$lib/tiptap/Bubble.svelte';
	import Floating from '$lib/tiptap/Floating.svelte';
	import Command from '$lib/tiptap/Command.svelte';
	import {
		countSlashItems,
		flattenSlashItems,
		normalizeSlashIndex,
		slashState
	} from '$lib/plugin/command/stores.svelte';
	import {
		I18N_CONTEXT,
		setLocale as setI18nLocale,
		translateWithLocale,
		type I18nTranslate
	} from '$lib/i18n';
	import type { UploadFn } from '$lib/plugin/image/dragdrop';
	import { fallbackUpload } from '$lib/plugin/image/dragdrop';
	import MediaResize, { type ResizeOptions } from '$lib/plugin/resize';
	import { Render } from 'nunui';

	type Props = {
		body: string;
		editable?: boolean;
		mark?: boolean;
		ref?: any;
		options?: Record<string, any>;
		loaded?: boolean;
		imageUpload?: UploadFn;
		style?: string;
		blocks?: any[];
		placeholder?: string;
		locale?: string;
		sanitize?: Record<string, any>;
		colors?: string[];
		bubble?: any;
		bubbleDocked?: boolean;
		preloader?: any;
		crossorigin?: 'anonymous' | 'use-credentials';
		codeBlockLanguageLabels?: Record<string, string>;
		resize?: boolean | ResizeOptions;
	};

	let {
		body = $bindable<string>(),
		editable = false,
		mark = false,
		ref = $bindable(null),
		options = {},
		loaded = $bindable(false),
		imageUpload = fallbackUpload,
		style = '',
		blocks = [],
		placeholder,
		locale,
		sanitize = {},
		colors = [
			'#ef5350', //red
			'#ec407a', //pink
			'#ff7043', //orange
			'#daca3b', //yellow
			'#8bc34a', //green
			'#2196f3', //blue
			'#3f51b5', //blue
			'#ab47bc' //purple
		],
		bubble = null,
		bubbleDocked = false,
		preloader,
		crossorigin = 'anonymous',
		codeBlockLanguageLabels = {},
		resize = true
	}: Props = $props();

	const scopedI18n: I18nTranslate = (...args) => translateWithLocale(locale, ...args);
	const resizeDataAttrs = [
		'data-resize-handler',
		'data-resize-target',
		'data-resize-min-height',
		'data-resize-max-height',
		'data-bubble-menu',
		'data-hide-bubble-menu'
	];

	const san = (body: string) =>
		sanitizeHtml(body || '', {
			...(sanitize || {}),
			allowedTags: sanitizeHtml.defaults.allowedTags.concat([
				'img',
				'math-inline',
				'math-node',
				'iframe',
				'lite-youtube',
				'blockquote',
				'embed',
				'mark',
				'code',
				'tiptap-upload-skeleton',
				...(sanitize.allowedTags || [])
			]),
			allowedStyles: '*' as any,
			allowedAttributes: {
				'*': ['style', 'class'],
				a: ['href', 'name', 'target'],
				img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', ...resizeDataAttrs],
				iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', ...resizeDataAttrs],
				th: ['colwidth', 'colspan', 'rowspan'],
				td: ['colwidth', 'colspan', 'rowspan'],
				'lite-youtube': ['videoid', 'params', 'nocookie', 'title', 'provider', ...resizeDataAttrs],
				embed: ['src', 'type', 'frameborder', 'allowfullscreen', ...resizeDataAttrs],
				'tiptap-upload-skeleton': [
					'data-upload-id',
					'data-upload-kind',
					'data-upload-height',
					'data-bubble-menu',
					'data-hide-bubble-menu'
				],
				mark: ['style', 'data-color'],
				code: ['class'],
				...(sanitize.allowedAttributes || [])
			}
		});

	const tiptap = $state({ v: null as any, c: 0 });
	setContext('editor', tiptap);
	setContext(I18N_CONTEXT, scopedI18n);
	let element: Element,
		fullscreen = $state(false),
		mounted = $state(false),
		last = $state('');

	$effect(() => {
		setI18nLocale(locale);
	});

	$effect(() => {
		if (tiptap.v) tiptap.v.setEditable(editable);
	});

	$effect(() => {
		(window as any).__image_uploader = imageUpload;
		(window as any).__tiptap_blocks = blocks;
	});

	$effect(() => {
		const r = untrack(() => san(body));
		body = r;
		last = r;
		mounted = true;
		Promise.all([import('./tiptap'), import('@justinribeiro/lite-youtube')]).then(
			([{ default: tt }]) => {
				if (!untrack(() => mounted)) return;
				const editorPlaceholder = placeholder ?? scopedI18n('placeholder');
				const optionPlugins = Array.isArray(options.plugins)
					? [...options.plugins]
					: options.plugins
						? [options.plugins]
						: [];
				if (resize) {
					const resizeOptions = typeof resize === 'object' ? resize : {};
					optionPlugins.unshift(MediaResize.configure(resizeOptions));
				}
				tiptap.v = ref = tt(element, r, {
					placeholder: editorPlaceholder,
					editable,
					onTransaction: () => {
						tiptap.v = ref = tiptap.v;
						tiptap.c++;
					},
					crossorigin,
					codeBlockLanguageLabels,
					...options,
					plugins: optionPlugins
				});
				tiptap.v.on('update', ({ editor: tiptap }: any) => {
					let content = tiptap.getHTML(),
						json = tiptap.getJSON().content;
					if (
						Array.isArray(json) &&
						json.length === 1 &&
						json[0].type === 'paragraph' &&
						!json[0].hasOwnProperty('content')
					)
						content = null;
					body = last = content;
				});
				loaded = true;
			}
		);
		return () => {
			mounted = false;
			untrack(() => tiptap.v?.destroy?.());
		};
	});

	$effect.pre(() => {
		if (last === body) return;
		const r = san(body);
		body = r;
		last = r;
		tiptap.v?.commands?.setContent?.(body);
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return true;
		if (!slashState.visible) return false;
		const count = countSlashItems();
		if (!count) return false;

		if (event.key === 'Tab') {
			event.preventDefault();
			slashState.selectedIndex += event.shiftKey ? -1 : 1;
			normalizeSlashIndex();
			return true;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			slashState.selectedIndex -= 1;
			normalizeSlashIndex();
			return true;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			slashState.selectedIndex += 1;
			normalizeSlashIndex();
			return true;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			selectItem(slashState.selectedIndex);
			return true;
		}

		return false;
	}

	function selectItem(index: number) {
		const item = flattenSlashItems()[index];
		const { editor, range } = slashState.props;
		if (!item || !editor || !range) return;
		item.command({ editor, range });
	}
</script>

<main class:fullscreen class:editable {style}>
	{#if bubbleDocked && (editable || mark)}
		<Bubble {colors} {editable} override={bubble} docked={bubbleDocked}>
			<Render it={bubble} />
		</Bubble>
	{/if}
	<div class="wrapper">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div bind:this={element} class="target" onkeydown={handleKeydown}></div>
		{#if !tiptap.v}
			{#if preloader}
				<Render it={preloader} />
			{:else}
				<div class="target">
					<div>
						{@html san(body)}
					</div>
				</div>
			{/if}
		{/if}
	</div>
	{#if editable}
		<Command />
		<Floating />
	{/if}
	{#if !bubbleDocked && (editable || mark)}
		<Bubble {colors} {editable} override={bubble} docked={bubbleDocked}>
			<Render it={bubble} />
		</Bubble>
	{/if}
</main>

<style>
	main {
		position: relative;
		overscroll-behavior: none;
		--shadow:
			0 1px 2px rgba(127, 127, 127, 0.07), 0 2px 4px rgba(127, 127, 127, 0.07),
			0 4px 8px rgba(127, 127, 127, 0.07), 0 8px 16px rgba(127, 127, 127, 0.07),
			0 16px 32px rgba(127, 127, 127, 0.07), 0 32px 64px rgba(127, 127, 127, 0.07);
		&.fullscreen {
			z-index: 999999999;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: var(--surface);
			padding: 82px 12px 12px 12px;
		}

		& .wrapper {
			position: relative;
		}
	}

	main :global(.tiptap-code-block-toolbar) {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 1;
		display: flex;
		justify-content: flex-end;
	}

	main:not(.editable) :global(.tiptap-code-block-toolbar) {
		visibility: hidden;
		pointer-events: none;
	}

	.target > :global(div) > :global(*:first-child) {
		margin-top: 0 !important;
	}

	.target > :global(div) > :global(*:last-child) {
		margin-bottom: 0 !important;
	}

	.editable :global(.ProseMirror-selectednode img) {
		transition: all 0.2s ease-in-out;
		outline: 3px solid var(--primary);
		outline-offset: 2px;
		filter: none;
	}

	.editable :global(.iframe-wrapper.ProseMirror-selectednode) {
		outline: 3px solid var(--primary);
	}

	.editable :global(lite-youtube.ProseMirror-selectednode) {
		outline: 3px solid var(--primary);
	}

	.editable :global(.tiptap-media-resize-anchor) {
		width: 100%;
		display: flex;
		justify-content: center;
		margin: 6px 0 2px;
		line-height: 0;
		pointer-events: none;
	}

	.editable :global(.tiptap-media-resize-handle) {
		appearance: none;
		-webkit-appearance: none;
		display: block;
		width: 42px;
		height: 8px;
		margin: 0;
		padding: 0;
		border: 1px solid var(--primary-light3, rgba(120, 120, 120, 0.45));
		border-radius: 999px;
		background: var(--primary-light6, rgba(120, 120, 120, 0.2));
		cursor: ns-resize;
		pointer-events: auto;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.editable :global(.tiptap-media-resize-handle:hover),
	.editable :global(.tiptap-media-resize-handle:focus-visible) {
		background: var(--primary-light4, rgba(120, 120, 120, 0.35));
		border-color: var(--primary-light2, rgba(100, 100, 100, 0.55));
		outline: none;
	}

	.editable :global(.tiptap-media-resize-handle:active) {
		transform: translateY(1px);
	}

	.editable :global(.tiptap-media-resize-proxy) {
		width: 100%;
		border-radius: 12px;
		background: var(--primary-light4, rgba(120, 120, 120, 0.35));
		opacity: 0.55;
		pointer-events: none;
	}

	div > :global(div) {
		outline: none !important;
		& :global(.ProseMirror) :global(p.is-editor-empty:first-child::before) {
			color: var(--on-surface, #000);
			opacity: 0.7;
			content: attr(data-placeholder);
			float: left;
			height: 0;
			pointer-events: none;
			transition: 0.2s opacity ease-in-out;
		}

		& :global(.ProseMirror-focused) :global(p.is-editor-empty:first-child::before) {
			opacity: 0;
		}

		& :global(a) {
			cursor: pointer;
		}

		& :global(img) {
			transition: all 0.2s ease-in-out;
			max-width: 100%;
			border-radius: 12px;
			position: relative;
		}

		& :global(code.inline) {
			background: var(--primary-light1);
			padding: 2px 4px;
			border-radius: 4px;
		}

		& :global(pre) {
			background: var(--primary-light1);
			padding: 12px;
			border-radius: 12px;
			max-width: 100%;
		}

		& :global(.tiptap-code-block) {
			max-width: 100%;
			position: relative;
		}

		& :global(.tiptap-code-block-language) {
			padding: 2px 6px;
			border-radius: 8px;
			border: 1px solid var(--primary-light2, #ddd);
			outline: 1px solid transparent;
			outline-offset: 0;
			background: var(--surface, #fff);
			color: var(--on-surface, #000);
			font-size: 0.75em;

			&:focus,
			&:focus-visible {
				outline-color: var(--primary-light9, #89a2d9);
			}
		}

		& :global(table) {
			border-collapse: collapse;
			width: 100%;
			margin: 8px 0;
			border: 1px solid var(--primary-light1);
			border-radius: 12px;
		}

		& :global(th),
		& :global(td) {
			padding: 8px;
			border: 1px solid var(--primary-light1);
		}

		& :global(.math-render) {
			cursor: initial;
		}

		& :global(lite-youtube) {
			border-radius: 12px;
		}

		& :global(.iframe-wrapper) {
			position: relative;
			padding-bottom: 12px;
			overflow: hidden;
			width: 100%;
			height: 600px;
			border-radius: 12px;
		}

		& :global(iframe) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	}
</style>
