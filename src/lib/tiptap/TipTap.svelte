<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy, setContext } from 'svelte';
	import sanitizeHtml from 'sanitize-html';
	import '@seorii/prosemirror-math/style.css';
	import Bubble from '$lib/tiptap/Bubble.svelte';
	import Floating from '$lib/tiptap/Floating.svelte';
	import Command from '$lib/tiptap/Command.svelte';
	import { slashItems, slashProps, slashVisible } from '$lib/plugin/command/stores';
	import i18n from '$lib/i18n';
	import type { UploadFn } from '$lib/plugin/image/dragdrop';
	import { fallbackUpload } from '$lib/plugin/image/dragdrop';
	import { Render } from 'nunui';

	type Props = {
		body: string;
		editable: boolean;
		mark: boolean;
		ref: any;
		options: Record<string, any>;
		loaded: boolean;
		imageUpload: UploadFn;
		style: string;
		blocks: any[];
		placeholder: string;
		sanitize: Record<string, any>;
		colors: string[];
		bubble?: any;
		preloader?: any;
	};

	let {
		body = $bindable(''),
		editable = false,
		mark = false,
		ref = null,
		options = {},
		loaded = false,
		imageUpload = fallbackUpload,
		style = '',
		blocks = [],
		placeholder = i18n('placeholder'),
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
		preloader
	}: Props = $props();

	const san = (body: string) =>
		sanitizeHtml(body, {
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
				...(sanitize.allowedTags || [])
			]),
			allowedStyles: '*' as any,
			allowedAttributes: {
				'*': ['style', 'class'],
				a: ['href', 'name', 'target'],
				img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
				iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
				th: ['colwidth', 'colspan', 'rowspan'],
				td: ['colwidth', 'colspan', 'rowspan'],
				'lite-youtube': ['videoid', 'params', 'nocookie', 'title', 'provider'],
				embed: ['src', 'type', 'frameborder', 'allowfullscreen'],
				mark: ['style', 'data-color'],
				code: ['class'],
				...(sanitize.allowedAttributes || [])
			}
		});

	const tiptap = $state({ v: null as any });
	setContext('editor', tiptap);
	let element: Element,
		fullscreen = $state(false),
		mounted = $state(false),
		last = $state('');

	$effect(() => {
		if (tiptap.v) tiptap.v.setEditable(editable);
	});

	$effect(() => {
		if (browser) {
			(window as any).__image_uploader = imageUpload;
			(window as any).__tiptap_blocks = blocks;
		}
	});

	if (browser)
		onMount(() => {
			body = last = san(body);
			mounted = true;
			Promise.all([import('./tiptap'), import('@justinribeiro/lite-youtube')]).then(
				([{ default: tt }]) => {
					if (!mounted) return;
					tiptap.v = ref = tt(element, body, {
						placeholder,
						editable,
						onTransaction: () => (tiptap.v = ref = tiptap.v),
						...options
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
		});

	onDestroy(() => {
		mounted = false;
		tiptap.v?.destroy?.();
	});

	$effect.pre(() => {
		if (last === body) return;
		body = san(body);
		tiptap.v?.commands?.setContent?.(body);
	});

	let selectedIndex = $state(0);
	$effect(() => {
		if (!slashVisible) selectedIndex = 0;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!$slashVisible) return;
		let count = $slashItems.length;
		if ($slashItems[0]?.list) count = $slashItems.reduce((acc, item) => acc + item.list.length, 0);
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex + count - 1) % count;
			return true;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % count;
			return true;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			selectItem(selectedIndex);
			return true;
		}

		return false;
	}

	function selectItem(index) {
		const item = $slashItems[0]?.list
			? $slashItems.map((i) => i.list).flat()[index]
			: $slashItems[index];
		if (item) {
			let range = $slashProps.range;
			item.command({ editor: tiptap.v, range });
		}
	}
</script>

<main class:fullscreen class:editable {style}>
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
		<Command {selectedIndex} />
		<Floating />
	{/if}
	{#if editable || mark}
		<Bubble {colors} {editable} override={bubble}>
			<Render it={bubble} />
		</Bubble>
	{/if}
</main>

<style lang="scss">
	main {
		position: relative;
		overscroll-behavior: none;
		--shadow: 0 1px 2px rgba(127, 127, 127, 0.07), 0 2px 4px rgba(127, 127, 127, 0.07),
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

		.wrapper {
			position: relative;
		}
	}

	.target > :global(div) {
		& > :global(*:first-child) {
			margin-top: 0 !important;
		}

		& > :global(*:last-child) {
			margin-bottom: 0 !important;
		}
	}

	.editable :global(.ProseMirror-selectednode img) {
		transition: all 0.2s ease-in-out;
		filter: drop-shadow(0 0 0.75rem var(--primary-light13));
	}

	.editable :global(.iframe-wrapper.ProseMirror-selectednode) {
		outline: 3px solid var(--primary);
	}

	.editable :global(lite-youtube.ProseMirror-selectednode) {
		outline: 3px solid var(--primary);
	}

	div > :global(div) {
		outline: none !important;

		:global(.ProseMirror) :global(p.is-editor-empty:first-child::before) {
			color: var(--on-surface, #000);
			opacity: 0.7;
			content: attr(data-placeholder);
			float: left;
			height: 0;
			pointer-events: none;
			transition: 0.2s opacity ease-in-out;
		}

		:global(.ProseMirror-focused) :global(p.is-editor-empty:first-child::before) {
			opacity: 0;
		}

		:global(a) {
			cursor: pointer;
		}

		:global(img) {
			transition: all 0.2s ease-in-out;
			max-width: 100%;
			border-radius: 12px;
			position: relative;
		}

		:global(code.inline) {
			background: var(--primary-light1);
			padding: 2px 4px;
			border-radius: 4px;
		}

		:global(pre) {
			background: var(--primary-light1);
			padding: 12px;
			border-radius: 12px;
			max-width: 100%;
		}

		:global(table) {
			border-collapse: collapse;
			width: 100%;
			margin: 8px 0;
			border: 1px solid var(--primary-light1);
			border-radius: 12px;
		}

		:global(th),
		:global(td) {
			padding: 8px;
			border: 1px solid var(--primary-light1);
		}

		:global(.math-render) {
			cursor: initial;
		}

		:global(lite-youtube) {
			border-radius: 12px;
		}

		:global(.iframe-wrapper) {
			position: relative;
			padding-bottom: 12px;
			overflow: hidden;
			width: 100%;
			height: 600px;
			border-radius: 12px;
		}

		:global(iframe) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	}
</style>
