<script lang="ts">
	import { BubbleMenu } from 'svelte-tiptap';
	import { flushSync, getContext, tick, untrack } from 'svelte';
	import 'tippy.js/animations/shift-away-subtle.css';
	import ToolbarButton from '$lib/tiptap/ToolbarButton.svelte';
	import { isTableAnySelected } from '$lib/plugin/table/util';
	import deleteTable from '$lib/plugin/table/deleteTable';
	import setMath from '$lib/tiptap/setMath';
	import { Button, Icon, IconButton, Input, List, OneLine, Paper, Render } from 'nunui';
	import defaultI18n, { I18N_CONTEXT, type I18nTranslate } from '$lib/i18n';
	import ColorPicker from 'svelte-awesome-color-picker';
	import { isTextSelection } from '@tiptap/core';
	import { NodeSelection, type EditorState, type Selection } from '@tiptap/pm/state';
	import type { EditorView } from '@tiptap/pm/view';

	type Props = {
		colors?: string[];
		editable?: boolean;
		override?: any;
		docked?: boolean;
		children?: any;
	};

	let { colors = [], editable, override, docked = false, children }: Props = $props();

	const editor = getContext<{ v: any; c: number }>('editor');
	const i18nFromContext = getContext<I18nTranslate | undefined>(I18N_CONTEXT);
	const i18n: I18nTranslate = (...args) =>
		i18nFromContext ? i18nFromContext(...args) : defaultI18n(...args);
	const tiptap = $derived(editor.v);
	const currentTextColor = $derived.by(() => {
		editor.c;
		const color = tiptap?.getAttributes('textStyle')?.color;
		return typeof color === 'string' ? color.trim().toLowerCase() : '';
	});
	const hasTextColor = $derived.by(() => {
		editor.c;
		return !!tiptap?.getAttributes('textStyle')?.color;
	});

	let selection = $state<Selection | null>(null);
	let table = $state<number[] | false>(false);
	let sel = $state('');
	let _sel = $state('');
	let link = $state(false);
	let href = $state('');

	$effect(() => {
		let _ = editor.c;
		flushSync();
		selection = tiptap?.state?.selection;
	});

	$effect(() => {
		table = isTableAnySelected(selection);
	});

	$effect(() => {
		sel = selection?.from + '-' + selection?.to;
	});

	$effect(() => {
		if (tiptap && sel !== _sel) {
			_sel = sel;
			link = false;
			href = tiptap.getAttributes('link').href || '';
		}
	});

	$effect(() => {
		const _href = href;
		untrack(() => {
			if (tiptap && link) {
				if (href) {
					tiptap.chain().setLink({ href: _href }).run();
				} else if (tiptap.getAttributes('link').href) {
					tiptap.chain().unsetLink().run();
				}
			}
		});
	});

	const shouldShow = ({
		state,
		view,
		from,
		to
	}: {
		view: EditorView;
		state: EditorState;
		from: number;
		to: number;
	}) => {
		if (!tiptap?.isEditable) return false;

		const { doc, selection } = state;
		const { empty } = selection;

		if (selection instanceof NodeSelection && selection.node.isBlock) {
			const nodeDom = view.nodeDOM(from);
			if (
				nodeDom instanceof Element &&
				(nodeDom.hasAttribute('data-hide-bubble-menu') ||
					nodeDom.getAttribute('data-bubble-menu') === 'false' ||
					Boolean(nodeDom.querySelector('[data-hide-bubble-menu], [data-bubble-menu="false"]')))
			) {
				return false;
			}
		}

		const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(state.selection);

		return !(empty || isEmptyTextBlock);
	};
</script>

{#if tiptap}
	{#snippet toolbar()}
		{#if override}
			<main class:docked>
				<Render it={override} />
			</main>
		{:else}
			<main class:docked>
				{#if link}
					<div class="link">
						<p>
							<Icon icon="link" />
							{i18n('link')}
						</p>
						<Input placeholder="url" bind:value={href} autofocus />
						<div>
							<Button
								tabindex={0}
								transparent
								small
								onclick={() => {
									href = '';
									tiptap.chain().focus().unsetLink().run();
									tick().then(() => (link = false));
								}}
								>{i18n('delete')}
							</Button>
							<Button tabindex={0} transparent small onclick={() => (link = false)}
								>{i18n('close')}</Button
							>
						</div>
					</div>
				{:else if table}
					{#if table.length > 1}
						<ToolbarButton icon="cell_merge" handler={() => tiptap.commands.mergeCells()} />
					{:else}
						<ToolbarButton icon="splitscreen_left" handler={() => tiptap.commands.splitCell()} />
					{/if}
					<ToolbarButton
						icon="keyboard_double_arrow_left"
						handler={() => tiptap.chain().focus().addColumnBefore().run()}
					/>
					<ToolbarButton
						icon="keyboard_double_arrow_right"
						handler={() => tiptap.chain().focus().addColumnAfter().run()}
					/>
					<ToolbarButton
						icon="keyboard_double_arrow_up"
						handler={() => tiptap.chain().focus().addRowBefore().run()}
					/>
					<ToolbarButton
						icon="keyboard_double_arrow_down"
						handler={() => tiptap.chain().focus().addRowAfter().run()}
					/>
					<ToolbarButton icon="close" handler={() => deleteTable({ editor: tiptap })} />
				{:else}
					{#if editable}
						<Paper hover bl remap>
							{#snippet target()}
								<IconButton size="1.2em" icon="format_align_left" />
							{/snippet}
							<div class="menu-list align-menu">
								<List>
									<OneLine
										icon="format_align_left"
										title={i18n('alignLeft')}
										onclick={() => tiptap.chain().focus().setTextAlign('left').run()}
										active={tiptap.isActive({ textAlign: 'left' })}
									/>
									<OneLine
										icon="format_align_center"
										title={i18n('alignCenter')}
										onclick={() => tiptap.chain().focus().setTextAlign('center').run()}
										active={tiptap.isActive({ textAlign: 'center' })}
									/>
									<OneLine
										icon="format_align_right"
										title={i18n('alignRight')}
										onclick={() => tiptap.chain().focus().setTextAlign('right').run()}
										active={tiptap.isActive({ textAlign: 'right' })}
									/>
									<OneLine
										icon="format_align_justify"
										title={i18n('alignJustify')}
										onclick={() => tiptap.chain().focus().setTextAlign('justify').run()}
										active={tiptap.isActive({ textAlign: 'justify' })}
									/>
								</List>
							</div>
						</Paper>
					{/if}
					<ToolbarButton icon="format_bold" prop="bold" />
					<ToolbarButton icon="format_italic" prop="italic" />
					<ToolbarButton icon="format_strikethrough" prop="strike" />
					<ToolbarButton icon="format_underlined" prop="underline" />
					<ToolbarButton icon="superscript" prop="superscript" />
					<ToolbarButton icon="subscript" prop="subscript" />
					<ToolbarButton icon="border_color" prop="highlight" />
					{#if editable}
						<ToolbarButton icon="functions" prop="math_inline" handler={() => setMath(tiptap)} />
					{/if}
					<Paper bl remap>
						{#snippet target()}
							<IconButton size="1.2em" icon="palette" />
						{/snippet}
						<div class="menu-list">
							<div class="colors">
								<Button
									small
									outlined
									active={!hasTextColor}
									class={!hasTextColor ? 'color-active' : undefined}
									onclick={() => tiptap.chain().focus().unsetColor().run()}
								>
									{i18n('default')}
								</Button>
								<Paper bl remap block>
									{#snippet target()}
										<Button
											small
											full
											outlined
											active={hasTextColor}
											class={hasTextColor ? 'color-active' : undefined}
											onclick={() => tiptap.chain().focus().unsetColor().run()}
										>
											<Icon icon="palette" />
										</Button>
									{/snippet}
									<div role="presentation" onmousedown={(event) => event.stopPropagation()}>
										<ColorPicker
											isDialog={false}
											onInput={(event) => {
												tiptap.chain().focus().setColor(event.hex).run();
											}}
										/>
									</div>
								</Paper>
								{#each colors as color (color)}
									<Button
										small
										outlined
										active={currentTextColor === color.toLowerCase()}
										class={currentTextColor === color.toLowerCase() ? 'color-active' : undefined}
										onclick={() => tiptap.chain().focus().setColor(color).run()}
									>
										<span style:background={color} class="pal"></span>
									</Button>
								{/each}
							</div>
						</div>
					</Paper>
					{#if editable}
						<ToolbarButton icon="code" prop="code" />
						<ToolbarButton icon="link" prop="link" handler={() => (link = true)} />
					{/if}
				{/if}
				<Render it={children} />
			</main>
		{/if}
	{/snippet}

	{#if docked && tiptap.isEditable}
		<div class="docked-menu">
			{@render toolbar()}
		</div>
	{:else}
		<BubbleMenu
			editor={tiptap}
			updateDelay={50}
			{shouldShow}
			tippyOptions={{
				moveTransition: 'transform 0.2s cubic-bezier(1,.5,0,.85)',
				animation: 'shift-away-subtle',
				duration: [200, 50]
			}}
		>
			{@render toolbar()}
		</BubbleMenu>
	{/if}
{/if}

<style>
	main {
		box-shadow:
			0 10px 24px rgba(22, 37, 63, 0.14),
			0 2px 8px rgba(22, 37, 63, 0.1);
		background: var(--surface, #fff);
		border: 1px solid var(--primary-light2, #d5dff3);
		color: var(--on-surface, #000);
		padding: 8px 10px;
		border-radius: 12px;
		display: flex;
		flex-wrap: nowrap;
		gap: 4px;
		align-items: center;
		justify-content: center;
		font-size: 1.2em;
		& > :global(*) {
			margin: 0;
		}
	}

	.docked-menu {
		position: sticky;
		top: var(--tiptap-toolbar-sticky-top, 8px);
		z-index: 40;
		display: flex;
		justify-content: center;
		margin-bottom: 10px;
		padding: 4px 0;
	}

	main.docked {
		width: 100%;
		justify-content: flex-start;
		border-radius: 14px;
		overflow-x: auto;
		overflow-y: hidden;
		backdrop-filter: blur(10px) saturate(1.15);
		-webkit-backdrop-filter: blur(10px) saturate(1.15);
	}

	main:not(.docked) {
		overflow-x: auto;
		overflow-y: hidden;
	}

	main.docked > :global(*) {
		flex-shrink: 0;
	}

	main.docked :global(button) {
		font-size: 1.08em;
	}

	main.docked > :global(main.i) {
		display: flex;
		align-items: center;
		line-height: 1;
		transform: translateY(-1px);
	}

	.menu-list {
		font-size: 0.6em;
	}

	.align-menu {
		margin: -6px;
	}

	main.docked .menu-list {
		font-size: 0.72em;
	}

	@media (max-width: 768px) {
		main {
			font-size: 1.05em;
		}
	}

	.link {
		display: flex;
		flex-direction: column;
		font-size: 0.7em;

		& p {
			margin: 0 0 0.6em 0;
		}

		& div {
			margin-top: 0.6em;
			display: flex;
			justify-content: flex-end;
		}
	}

	.colors {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 4px;

		& > :global(:first-child) {
			grid-column: 1/3;
		}

		& :global(button.color-active) {
			box-shadow: inset 0 0 0 1px var(--primary-dark2, #2d4b8f);
			background: color-mix(in srgb, var(--primary-light1, #eef3ff) 65%, var(--surface, #fff));
		}

		& :global(button.color-active .pal) {
			outline: 1px solid color-mix(in srgb, var(--on-surface, #111) 65%, transparent);
			outline-offset: 1px;
		}
	}

	.pal {
		width: 20px;
		height: 16px;
		border-radius: 4px;
		display: inline-block;
		margin-bottom: -2px;
	}
</style>
