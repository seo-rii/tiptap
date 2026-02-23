<script lang="ts">
	import { Button, IconButton, Input, List, OneLine, TwoLine } from 'nunui';
	import { getContext, tick } from 'svelte';
	import {
		isSlashGroup,
		isSlashItem,
		slashState,
		type SlashGroup,
		type SlashItem
	} from '../plugin/command/stores.svelte';
	import { fly, slide } from 'svelte/transition';
	import { quartOut } from 'svelte/easing';
	import defaultI18n, { I18N_CONTEXT, type I18nTranslate } from '$lib/i18n';

	const editor = getContext<{ v: any }>('editor');
	const i18nFromContext = getContext<I18nTranslate | undefined>(I18N_CONTEXT);
	const i18n: I18nTranslate = (...args) =>
		i18nFromContext ? i18nFromContext(...args) : defaultI18n(...args);
	const tiptap = $derived(editor.v);

	let height = $state(0);
	let input = $state(''),
		focus = $state<HTMLInputElement | HTMLTextAreaElement | undefined>(undefined);
	let menu = $state<HTMLElement | null>(null);

	const emojiItems = $derived(slashState.items.filter(isSlashItem));
	const groupedItems = $derived(slashState.items.filter(isSlashGroup));

	function runCommand(item: SlashItem | undefined) {
		if (!item) return;
		const { editor, range } = slashState.props;
		if (!editor || !range) return;

		item.command({ editor, range });
		setTimeout(() => tiptap?.commands?.focus?.());
	}

	function runDetailCommand() {
		const detail = slashState.detail;
		if (!detail || detail === 'emoji') return;

		slashState.selection?.();
		detail.handler(input);
	}

	$effect(() => {
		if (slashState.visible) input = '';
	});
	$effect(() => {
		focus;
		setTimeout(() => focus?.focus?.(), 100);
	});

	$effect(() => {
		if (!slashState.visible) return;
		const detail = slashState.detail;
		if (detail && detail !== 'emoji') return;

		const selectedIndex = slashState.selectedIndex;
		void tick().then(() => {
			const target = menu?.querySelector<HTMLElement>(`[data-slash-index="${selectedIndex}"]`);
			target?.scrollIntoView({ block: 'nearest' });
		});
	});
</script>

<svelte:window bind:innerHeight={height} />

{#if slashState.visible}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="scrim" onclick={() => (slashState.visible = false)}></div>
	<main
		bind:this={menu}
		style="left: {slashState.location.x}px; top: {slashState.location.y +
			slashState.location.height +
			384 >
		height
			? slashState.location.y - slashState.location.height - 384
			: slashState.location.y + slashState.location.height}px;"
		transition:fly={{ y: 10, duration: 200, easing: quartOut }}
	>
		{#if slashState.detail === 'emoji'}
			<div class="list">
				<List>
					{#each emojiItems as item, i (item.title)}
						<div data-slash-index={i} transition:slide={{ duration: 400, easing: quartOut }}>
							<OneLine
								onclick={() => runCommand(item)}
								title={item.title}
								active={slashState.selectedIndex === i}
							/>
						</div>
					{/each}
					{#if !emojiItems.length}
						<div class="section" transition:slide={{ duration: 400, easing: quartOut }}>
							{i18n('noResult')}
						</div>
					{/if}
				</List>
			</div>
		{:else if slashState.detail}
			<div class="detail">
				<header>
					<IconButton icon="arrow_back" onclick={() => (slashState.detail = null)} />
					<div class="title">{slashState.detail.title}</div>
				</header>
				<Input
					placeholder={slashState.detail.placeholder}
					block
					bind:value={input}
					bind:input={focus}
					onsubmit={runDetailCommand}
				/>
				<footer>
					<Button
						tabindex={0}
						transparent
						small
						onclick={() => {
							input = '';
							slashState.detail = null;
						}}
						>{i18n('cancel')}
					</Button>
					<Button tabindex={0} transparent small onclick={runDetailCommand}
						>{i18n('insert')}
					</Button>
				</footer>
			</div>
		{:else}
			<div class="list">
				<List>
					{#each groupedItems as group, j (group.section)}
						{@const lastCount = groupedItems
							.slice(0, j)
							.reduce((acc, cur) => acc + cur.list.length, 0)}
						<div class="section" transition:slide={{ duration: 400, easing: quartOut }}>
							{group.section}
						</div>
						<div transition:slide={{ duration: 400, easing: quartOut }}>
							{#each group.list as item, i (item.title)}
								<div
									data-slash-index={i + lastCount}
									transition:slide={{ duration: 400, easing: quartOut }}
								>
									<TwoLine
										onmouseenter={() => (slashState.selectedIndex = i + lastCount)}
										onclick={() => runCommand(item)}
										icon={item.icon}
										title={item.title}
										subtitle={item.subtitle || ''}
										active={slashState.selectedIndex === i + lastCount}
									/>
								</div>
							{/each}
						</div>
					{/each}
					{#if !groupedItems.length}
						<div class="section" transition:slide={{ duration: 400, easing: quartOut }}>
							{i18n('noResult')}
						</div>
					{/if}
				</List>
			</div>
		{/if}
	</main>
{/if}

<style>
	.scrim {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		cursor: default;
		z-index: 0;
	}

	main {
		position: fixed;
		background: var(--surface, #fff);
		width: 220px;
		max-height: 384px;
		border-radius: 4px;
		overflow-y: scroll;
		z-index: 10;
		box-shadow: var(--shadow);
	}

	.section {
		padding: 8px 16px;
		font-size: 0.8em;
		font-weight: 300;
		color: var(--on-surface, #000);
		opacity: 0.7;
	}

	.list {
		color: var(--primary-dark7);

		& :global(.title) {
			font-size: 0.7em !important;
			font-weight: 300 !important;
			margin-bottom: 4px;
		}

		& :global(.subtitle) {
			font-size: 0.8em !important;
			font-weight: 300 !important;
			color: var(--primary-dark1);
		}
	}

	.detail {
		font-size: 0.8em;
		padding: 8px;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		margin-bottom: 6px;

		& > :global(*) {
			margin-right: 8px;

			&:last-child {
				margin-right: 0;
			}
		}
	}

	footer {
		margin-top: 0.6em;
		display: flex;
		justify-content: flex-end;
	}
</style>
