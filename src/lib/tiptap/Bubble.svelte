<script lang="ts">
    import {BubbleMenu} from "svelte-tiptap";
    import {getContext} from "svelte";
    import 'tippy.js/animations/shift-away-subtle.css';
    import ToolbarButton from "$lib/tiptap/ToolbarButton.svelte";
    import {isTableAnySelected} from "$lib/plugin/table/util";
    import deleteTable from "$lib/plugin/table/deleteTable";
    import {TextSelection} from "prosemirror-state";
    //@ts-ignore
    import {MathInline} from "@seorii/prosemirror-math/tiptap";

    const tiptap = getContext<any>('editor')

    $: selection = $tiptap?.state?.selection
    $: table = isTableAnySelected(selection)

    function setMath() {
        $tiptap.chain().command(({state, tr}) =>
            state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
                if (!node.isTextblock || selection.from === selection.to) return;

                const startPosition = Math.max(position + 1, selection.from);
                const endPosition = Math.min(position + node.nodeSize, selection.to);

                const substringFrom = Math.max(0, selection.from - position - 1);
                const substringTo = Math.max(0, selection.to - position - 1);
                const updatedText = node.textContent.substring(substringFrom, substringTo);
                const newNode = state.schema.nodes.math_inline.create(null, state.schema.text(updatedText))

                tr = tr.replaceWith(startPosition, endPosition, newNode);
            })).run();
    }
</script>


{#if $tiptap}
    <BubbleMenu editor={$tiptap} updateDelay={50}
                tippyOptions={{moveTransition: 'transform 0.2s cubic-bezier(1,.5,0,.85)', animation:'shift-away-subtle', duration: [200, 50]}}>
        {#if $$slots.default}
            <slot/>
        {:else}
            <main>
                {#if table}
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
                    <ToolbarButton icon="format_bold" prop="bold"/>
                    <ToolbarButton icon="format_italic" prop="italic"/>
                    <ToolbarButton icon="format_strikethrough" prop="strike"/>
                    <ToolbarButton icon="format_underlined" prop="underline"/>
                    <ToolbarButton icon="functions" handler={() => {
                        setMath()
                    }}/>
                    <ToolbarButton icon="code" prop="code"/>
                {/if}
            </main>
        {/if}
    </BubbleMenu>
{/if}

<style lang="scss">
  main {
    box-shadow: var(--shadow);
    background: var(--surface);
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
</style>