<script lang="ts">
	import { FloatingMenu } from 'svelte-tiptap';
	import { getContext } from 'svelte';
	import { IconButton, List, OneLine, Paper } from 'nunui';
	import type { CommandProps } from '@tiptap/core';
	import { NodeSelection } from '@tiptap/pm/state';
	import ToolbarButton from '$lib/tiptap/ToolbarButton.svelte';
	import i18n from '$lib/i18n';

	const editor = getContext<{ v: any }>('editor');
	const tiptap = $derived(editor.v);

	function insertMathInline() {
		tiptap
			.chain()
			.focus()
			.command(({ state, tr, dispatch }: CommandProps) => {
				const { math_inline: mathInline } = state.schema.nodes;
				if (!mathInline) return false;

				const fromSelection = state.selection.$from;
				const index = fromSelection.index();
				if (!fromSelection.parent.canReplaceWith(index, index, mathInline)) return false;

				const insertedPosition = fromSelection.pos;
				const mathNode = mathInline.create({});
				const nextTr = tr.replaceSelectionWith(mathNode);
				nextTr.setSelection(NodeSelection.create(nextTr.doc, insertedPosition));
				dispatch?.(nextTr);
				return true;
			})
			.run();
	}

	function insertCodeBlock() {
		tiptap.chain().focus().setCodeBlock({ language: null }).run();
	}
</script>

{#if tiptap}
	<FloatingMenu editor={tiptap} tippyOptions={{ animation: 'fade', duration: [200, 50] }}>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<main onmousedown={() => setTimeout(() => tiptap.commands.focus())}>
			<span>
				{i18n('newLineInfo')}
			</span>
			<Paper bl hover style="width: 160px">
				{#snippet target()}
					<IconButton size="1.2em" icon="text_fields" />
				{/snippet}
				<div style="margin: -6px">
					<List>
						<OneLine
							icon="counter_1"
							title="{i18n('title')} 1"
							onclick={() => tiptap.commands.setHeading({ level: 1 })}
						/>
						<OneLine
							icon="counter_2"
							title="{i18n('title')} 2"
							onclick={() => tiptap.commands.setHeading({ level: 2 })}
						/>
						<OneLine
							icon="counter_3"
							title="{i18n('title')} 3"
							onclick={() => tiptap.commands.setHeading({ level: 3 })}
						/>
						<OneLine
							icon="segment"
							title={i18n('paragraph')}
							onclick={() => tiptap.commands.setParagraph()}
						/>
					</List>
				</div>
			</Paper>
			<ToolbarButton icon="format_bold" prop="bold" />
			<ToolbarButton icon="format_italic" prop="italic" />
			<ToolbarButton icon="format_strikethrough" prop="strike" />
			<ToolbarButton icon="format_underlined" prop="underline" />
			<ToolbarButton
				icon="functions"
				handler={() => {
					insertMathInline();
				}}
			/>
			<ToolbarButton icon="code" handler={insertCodeBlock} />
		</main>
	</FloatingMenu>
{/if}

<style>
	span {
		opacity: 0.6;
	}

	main {
		display: flex;
		flex-wrap: wrap;
		width: max-content;
		align-items: center;
		position: relative;

		& > :global(*) {
			margin-right: 4px;
		}
	}
</style>
