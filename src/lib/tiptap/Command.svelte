<script lang="ts">
	import { Button, IconButton, Input, List, OneLine, TwoLine } from 'nunui';
	import { getContext } from 'svelte';
	import {
		slashVisible,
		slashItems,
		slashLocaltion,
		slashProps,
		slashDetail,
		slashSelection
	} from '../plugin/command/stores';
	import { fly, slide } from 'svelte/transition';
	import { quartOut } from 'svelte/easing';
	import i18n from '$lib/i18n';

	const editor = getContext<{ v: any }>('editor');
	const tiptap = $derived(editor.v);
	let { selectedIndex = 0 } = $props();

	let height = $state(0),
		elements = $state([]);
	let input = $state(''),
		focus = $state<HTMLInputElement | HTMLTextAreaElement | undefined>(undefined);

	$effect(() => {
		if ($slashVisible) input = '';
	});
	$effect(() => {
		focus;
		setTimeout(() => focus?.focus?.(), 100);
	});
</script>

<svelte:window bind:innerHeight={height} />

{#if $slashVisible}
	<div class="scrim" onclick={() => ($slashVisible = false)}></div>
	<main
		style="left: {$slashLocaltion.x}px; top: {$slashLocaltion.y + $slashLocaltion.height + 384 >
		height
			? $slashLocaltion.y - $slashLocaltion.height - 384
			: $slashLocaltion.y + $slashLocaltion.height}px;"
		transition:fly={{ y: 10, duration: 200, easing: quartOut }}
	>
		{#if $slashDetail === 'emoji'}
			<div class="list">
				<List>
					{#each $slashItems as { title, command }, i (title)}
						<div transition:slide={{ duration: 400, easing: quartOut }}>
							<OneLine
								onclick={() => {
									command?.($slashProps);
									setTimeout(() => tiptap.commands.focus());
								}}
								bind:this={elements[i]}
								{title}
								active={selectedIndex === i}
							/>
						</div>
					{/each}
					{#if !$slashItems.length}
						<div class="section" transition:slide={{ duration: 400, easing: quartOut }}>
							{i18n('noResult')}
						</div>
					{/if}
				</List>
			</div>
		{:else if $slashDetail?.type === 'code'}
			<div class="detail">
				<header>
					<IconButton icon="arrow_back" onclick={() => ($slashDetail = null)} />
					<div class="title">{i18n('insertCode')}</div>
				</header>
				<div>
					<Button
						small
						onclick={() => {
							$slashSelection?.();
							$slashDetail.handler(undefined);
						}}>{i18n('auto')}</Button
					>
					{#each ['cpp', 'python', 'java'] as lang}
						<Button
							small
							outlined
							onclick={() => {
								$slashSelection?.();
								$slashDetail.handler(lang);
							}}>{lang}</Button
						>
					{/each}
				</div>
			</div>
		{:else if $slashDetail}
			<div class="detail">
				<header>
					<IconButton icon="arrow_back" onclick={() => ($slashDetail = null)} />
					<div class="title">{$slashDetail.title}</div>
				</header>
				<Input
					placeholder={$slashDetail.placeholder}
					block
					bind:value={input}
					bind:input={focus}
					onsubmit={() => {
						$slashSelection?.();
						$slashDetail.handler(input);
					}}
				/>
				<footer>
					<Button
						tabindex={0}
						transparent
						small
						onclick={() => {
							input = '';
							$slashDetail = null;
						}}
						>{i18n('cancel')}
					</Button>
					<Button
						tabindex={0}
						transparent
						small
						onclick={() => {
							$slashSelection?.();
							$slashDetail.handler(input);
						}}
						>{i18n('insert')}
					</Button>
				</footer>
			</div>
		{:else}
			<div class="list">
				<List>
					{#each $slashItems as { section, list }, j (section)}
						{@const lastCount = $slashItems
							.slice(0, j)
							.reduce((acc, cur) => acc + cur.list.length, 0)}
						<div class="section" transition:slide={{ duration: 400, easing: quartOut }}>
							{section}
						</div>
						<div transition:slide={{ duration: 400, easing: quartOut }}>
							{#each list || [] as { title, subtitle, icon, command, section }, i (title)}
								<div transition:slide={{ duration: 400, easing: quartOut }}>
									<TwoLine
										onmouseenter={() => (selectedIndex = i + lastCount)}
										onclick={() => {
											command?.($slashProps);
											setTimeout(() => tiptap.commands.focus());
										}}
										bind:this={elements[i + lastCount]}
										{icon}
										{title}
										subtitle={subtitle || ''}
										active={selectedIndex === i + lastCount}
									/>
								</div>
							{/each}
						</div>
					{/each}
					{#if !$slashItems.length}
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
