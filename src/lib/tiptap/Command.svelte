<script lang="ts">
    import {List, TwoLine} from "nunui";
    import {getContext} from "svelte";
    import {slashVisible, slashItems, slashLocaltion, slashProps} from '../plugin/command/stores';
    import {fly, slide} from "svelte/transition";
    import {quartOut} from "svelte/easing";
    import {flip} from 'svelte/animate';

    const tiptap = getContext<any>('editor');
    export let selectedIndex = 0;

    let height = 0, elements = [];
</script>

<svelte:window bind:innerHeight={height}/>

{#if $slashVisible}
    <div class="scrim" on:click={() => $slashVisible = false}/>
    <main style="left: {$slashLocaltion.x}px; top: {$slashLocaltion.y + $slashLocaltion.height + 384 > height
			? $slashLocaltion.y - $slashLocaltion.height - 384
			: $slashLocaltion.y + $slashLocaltion.height}px;" transition:fly={{y: 10, duration: 200, easing: quartOut}}>
        <div class="list">
            <List>
                {#each $slashItems as {section, list}(section)}
                    <div class="section" transition:slide={{duration: 400, easing: quartOut}}>{section}</div>
                    <div transition:slide={{duration: 400, easing: quartOut}}>
                        {#each list || [] as {title, subtitle, icon, command, section}, i(title)}
                            <div transition:slide={{duration: 400, easing: quartOut}}>
                                <TwoLine on:mouseenter={() => (selectedIndex = i)} on:click={() => {
                                    $slashVisible = false;
                                    command?.($slashProps);
                                    setTimeout(() => $tiptap.commands.focus());
                                }} bind:this={elements[i]} {icon} {title} subtitle={subtitle || ''}/>
                            </div>
                        {/each}
                    </div>
                {/each}
                {#if !$slashItems.length}
                    <div class="section" transition:slide={{duration: 400, easing: quartOut}}>결과 없음</div>
                {/if}
            </List>
        </div>
    </main>
{/if}

<style lang="scss">
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
    position: absolute;
    background: var(--surface, #fff);
    width: 220px;
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
    opacity: 0.8;
  }

  .list {
    color: var(--primary-dark7);

    :global {
      .title {
        font-size: 0.7em !important;
        font-weight: 300 !important;
        margin-bottom: 4px;
      }

      .subtitle {
        font-size: 0.8em !important;
        font-weight: 300 !important;
        color: var(--primary-dark1);
      }
    }
  }
</style>