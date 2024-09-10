<script lang="ts">
	import { FloatingMenu } from 'svelte-tiptap';
	import { getContext } from 'svelte';
	import { IconButton, List, OneLine, Paper } from 'nunui';
	import ToolbarButton from '$lib/tiptap/ToolbarButton.svelte';
	import i18n from '$lib/i18n';

	const editor = getContext<{ v: any }>('editor');
	const tiptap = $derived(editor.v);
</script>

{#if tiptap}
	<FloatingMenu editor={tiptap} tippyOptions={{ animation: 'fade', duration: [200, 50] }}>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<main onmousedown={() => setTimeout(() => tiptap.commands.focus())}>
			<span>
				{i18n('newLineInfo')}
			</span>
			<Paper bl hover width="160px">
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
					const end = tiptap.state.selection.$to.pos;
					tiptap
						.chain()
						.focus()
						.insertContent({
							type: 'math_inline'
						})
						.insertContent(' ')
						.run();
				}}
			/>
			<ToolbarButton icon="code" prop="code" />
		</main>
	</FloatingMenu>
{/if}

<style lang="scss">
	span {
		opacity: 0.6;
	}

	main {
		display: flex;
		flex-wrap: wrap;
		width: max-content;
		align-items: center;

		& > :global(*) {
			margin-right: 4px;
		}
	}
</style>
