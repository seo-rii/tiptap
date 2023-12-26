<script lang="ts">
    import {BubbleMenu} from "svelte-tiptap";
    import {getContext, tick} from "svelte";
    import 'tippy.js/animations/shift-away-subtle.css';
    import ToolbarButton from "$lib/tiptap/ToolbarButton.svelte";
    import {isTableAnySelected} from "$lib/plugin/table/util";
    import deleteTable from "$lib/plugin/table/deleteTable";
    import setMath from "$lib/tiptap/setMath";
    import {Button, Icon, IconButton, Input, List, OneLine, Tooltip} from "nunui";
    import i18n from "$lib/i18n";

    export let colors = [];
    const tiptap = getContext<any>('editor')

    let link = false, href = '', sel = '', _sel = ''

    $: selection = $tiptap?.state?.selection
    $: table = isTableAnySelected(selection)
    $: sel = selection?.from + '-' + selection?.to
    $: if ($tiptap && sel !== _sel) {
        _sel = sel
        link = false
        href = $tiptap.getAttributes('link').href
    }
    $: if ($tiptap) {
        if (href) $tiptap.chain().setLink({href}).run()
        else if ($tiptap.getAttributes('link').href) $tiptap.chain().unsetLink().run()
    }
</script>

{#if $tiptap}
    <BubbleMenu editor={$tiptap} updateDelay={50}
                tippyOptions={{moveTransition: 'transform 0.2s cubic-bezier(1,.5,0,.85)', animation:'shift-away-subtle', duration: [200, 50]}}>
        {#if $$slots.default}
            <slot/>
        {:else}
            <main>
                {#if link}
                    <div class="link">
                        <p>
                            <Icon icon="link"/>
                            {i18n('link')}
                        </p>
                        <Input placeholder="url" fullWidth bind:value={href} autofocus/>
                        <div>
                            <Button tabindex="0" transparent small on:click={() => {
                                href = ''
                                $tiptap.chain().focus().unsetLink().run()
                                tick().then(() => link = false)
                            }}>{i18n('delete')}
                            </Button>
                            <Button tabindex="0" transparent small
                                    on:click={() => link = false}>{i18n('close')}</Button>
                        </div>
                    </div>
                {:else if table}
                    {#if table.length > 1}
                        <ToolbarButton icon="cell_merge" handler={() => $tiptap.commands.mergeCells()}/>
                    {:else}
                        <ToolbarButton icon="splitscreen_left" handler={() => $tiptap.commands.splitCell()}/>
                    {/if}
                    <ToolbarButton icon="keyboard_double_arrow_left"
                                   handler={() => $tiptap.chain().focus().addColumnBefore().run()}/>
                    <ToolbarButton icon="keyboard_double_arrow_right"
                                   handler={() => $tiptap.chain().focus().addColumnAfter().run()}/>
                    <ToolbarButton icon="keyboard_double_arrow_up"
                                   handler={() => $tiptap.chain().focus().addRowBefore().run()}/>
                    <ToolbarButton icon="keyboard_double_arrow_down"
                                   handler={() => $tiptap.chain().focus().addRowAfter().run()}/>
                    <ToolbarButton icon="close" handler={() => deleteTable({editor: $tiptap})}/>
                {:else}
                    <Tooltip bottom left xstack width="160px">
                        <IconButton size="1.2em" icon="format_align_left" slot="target"/>
                        <div style="margin: -6px;font-size: 0.6em">
                            <List>
                                <OneLine icon="format_align_left" title={i18n('alignLeft')}
                                         on:click={() => $tiptap.chain().focus().setTextAlign('left').run()}
                                         active={$tiptap.isActive({ textAlign: 'left' })}/>
                                <OneLine icon="format_align_center" title={i18n('alignCenter')}
                                         on:click={() => $tiptap.chain().focus().setTextAlign('center').run()}
                                         active={$tiptap.isActive({ textAlign: 'center' })}/>
                                <OneLine icon="format_align_right" title={i18n('alignRight')}
                                         on:click={() => $tiptap.chain().focus().setTextAlign('right').run()}
                                         active={$tiptap.isActive({ textAlign: 'right' })}/>
                                <OneLine icon="format_align_justify" title={i18n('alignJustify')}
                                         on:click={() => $tiptap.chain().focus().setTextAlign('justify').run()}
                                         active={$tiptap.isActive({ textAlign: 'justify' })}/>
                            </List>
                        </div>
                    </Tooltip>
                    <ToolbarButton icon="format_bold" prop="bold"/>
                    <ToolbarButton icon="format_italic" prop="italic"/>
                    <ToolbarButton icon="format_strikethrough" prop="strike"/>
                    <ToolbarButton icon="format_underlined" prop="underline"/>
                    <ToolbarButton icon="superscript" prop="superscript"/>
                    <ToolbarButton icon="subscript" prop="subscript"/>
                    <ToolbarButton icon="functions" handler={() => setMath($tiptap)}/>
                    <Tooltip bottom left xstack>
                        <IconButton size="1.2em" icon="palette" slot="target"/>
                        <div style="font-size: 0.6em">
                            <List>
                                <Button small outlined on:click={() => $tiptap.chain().focus().unsetColor().run()}>{i18n('default')}
                                </Button>
                                {#each colors as color}
                                    <Button small outlined
                                            on:click={() => $tiptap.chain().focus().setColor(color).run()}
                                            style="margin-right:4px">
                                        <span style="width: 20px; height: 16px; background: {color}; border-radius: 4px;display: inline-block;margin-bottom: -2px"></span>
                                    </Button>
                                {/each}
                            </List>
                        </div>
                    </Tooltip>
                    <ToolbarButton icon="code" prop="code"/>
                    <ToolbarButton icon="link" prop="link" handler={() => link = true}/>
                {/if}
            </main>
        {/if}
    </BubbleMenu>
{/if}

<style lang="scss">
  main {
    box-shadow: var(--shadow);
    background: var(--surface, #fff);
    color: var(--on-surface, #000);
    padding: 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2em;

    & > :global(*) {
      margin: 0 2px;

      &:first-child {
        margin-left: 0;
      }

      &:last-child {
        margin-right: 0;
      }
    }
  }

  .link {
    display: flex;
    flex-direction: column;
    font-size: 0.7em;

    p {
      margin: 0 0 0.6em 0;
    }

    div {
      margin-top: 0.6em;
      display: flex;
      justify-content: flex-end;
    }
  }
</style>