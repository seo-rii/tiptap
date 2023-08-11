<script lang="ts">
    import {Button, IconButton, Input, List, OneLine, TwoLine} from "nunui";
    import {getContext} from "svelte";
    import {
        slashVisible,
        slashItems,
        slashLocaltion,
        slashProps,
        slashDetail,
        slashSelection
    } from '../plugin/command/stores';
    import {fly, slide} from "svelte/transition";
    import {quartOut} from "svelte/easing";
    import i18n from "$lib/i18n";

    const tiptap = getContext<any>('editor');
    export let selectedIndex = 0;

    let height = 0, elements = [];
    let iframe = '', focus: any;

    $: if ($slashVisible) {
        iframe = '';
    }
    $: setTimeout(() => focus?.focus?.(), 100);
</script>

<svelte:window bind:innerHeight={height}/>

{#if $slashVisible}
    <div class="scrim" on:click={() => $slashVisible = false}/>
    <main style="left: {$slashLocaltion.x}px; top: {$slashLocaltion.y + $slashLocaltion.height + 384 > height
			? $slashLocaltion.y - $slashLocaltion.height - 384
			: $slashLocaltion.y + $slashLocaltion.height}px;" transition:fly={{y: 10, duration: 200, easing: quartOut}}>
        {#if $slashDetail === 'iframe'}
            <div class="detail">
                <header>
                    <IconButton icon="arrow_back" on:click={() => $slashDetail = ''}/>
                    <div class="title">iframe</div>
                </header>
                <Input placeholder="url" fullWidth bind:value={iframe} bind:input={focus}
                       on:submit={() => $tiptap.chain().focus().insertContent({type: 'iframe', attrs: {src: iframe}}).insertContent('\n').run()}/>
                <footer>
                    <Button tabindex="0" transparent small on:click={() => {
                        iframe = ''
                        $slashDetail = ''
                    }}>{i18n('cancel')}
                    </Button>
                    <Button tabindex="0" transparent small
                            on:click={() => {
                                $slashSelection?.();
                                $tiptap.chain().focus().insertContent({type: 'iframe', attrs: {src: iframe}}).insertContent('\n').run();
                            }}>{i18n('insert')}
                    </Button>
                </footer>
            </div>
        {:else if $slashDetail === 'youtube'}
            <div class="detail">
                <header>
                    <IconButton icon="arrow_back" on:click={() => $slashDetail = ''}/>
                    <div class="title">Youtube</div>
                </header>
                <Input placeholder="url" fullWidth bind:value={iframe} bind:input={focus}
                       on:submit={() => $tiptap.chain().focus().insertVideoPlayer({url: iframe}).insertContent('\n').run()}/>
                <footer>
                    <Button tabindex="0" transparent small on:click={() => {
                        iframe = ''
                        $slashDetail = ''
                    }}>{i18n('cancel')}
                    </Button>
                    <Button tabindex="0" transparent small on:click={() => {
                        $slashSelection?.();
                        $tiptap.chain().focus().insertVideoPlayer({url: iframe}).insertContent('\n').run();
                    }}>{i18n('insert')}
                    </Button>
                </footer>
            </div>
        {:else if $slashDetail === 'emoji'}
            <div class="list">
                <List>
                    {#each $slashItems as {title, command}, i(title)}
                        <div transition:slide={{duration: 400, easing: quartOut}}>
                            <OneLine on:click={() => {
                                command?.($slashProps);
                                setTimeout(() => $tiptap.commands.focus());
                            }} bind:this={elements[i]} {title} active={selectedIndex === i}/>
                        </div>
                    {/each}
                    {#if !$slashItems.length}
                        <div class="section"
                             transition:slide={{duration: 400, easing: quartOut}}>{i18n('noResult')}</div>
                    {/if}
                </List>
            </div>
        {:else}
            <div class="list">
                <List>
                    {#each $slashItems as {section, list}, j(section)}
                        {@const lastCount = $slashItems.slice(0, j).reduce((acc, cur) => acc + cur.list.length, 0)}
                        <div class="section" transition:slide={{duration: 400, easing: quartOut}}>{section}</div>
                        <div transition:slide={{duration: 400, easing: quartOut}}>
                            {#each list || [] as {title, subtitle, icon, command, section}, i(title)}
                                <div transition:slide={{duration: 400, easing: quartOut}}>
                                    <TwoLine on:mouseenter={() => (selectedIndex = i + lastCount)} on:click={() => {
                                        command?.($slashProps);
                                        setTimeout(() => $tiptap.commands.focus());
                                    }} bind:this={elements[i + lastCount]} {icon} {title} subtitle={subtitle || ''}
                                             active={selectedIndex === i + lastCount}/>
                                </div>
                            {/each}
                        </div>
                    {/each}
                    {#if !$slashItems.length}
                        <div class="section"
                             transition:slide={{duration: 400, easing: quartOut}}>{i18n('noResult')}</div>
                    {/if}
                </List>
            </div>
        {/if}
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