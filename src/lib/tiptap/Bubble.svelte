<script lang="ts">
    import {BubbleMenu} from "svelte-tiptap";
    import {getContext} from "svelte";
    import 'tippy.js/animations/shift-away-subtle.css';
    import ToolbarButton from "$lib/tiptap/ToolbarButton.svelte";

    const tiptap = getContext<any>('editor');
</script>


{#if $tiptap}
    <BubbleMenu editor={$tiptap} updateDelay={50}
                tippyOptions={{moveTransition: 'transform 0.2s cubic-bezier(1,.5,0,.85)', animation:'shift-away-subtle', duration: [200, 50]}}>
        {#if $$slots.default}
            <slot/>
        {:else}
            <main>
                <ToolbarButton icon="format_bold" prop="bold"/>
                <ToolbarButton icon="format_italic" prop="italic"/>
                <ToolbarButton icon="format_strikethrough" prop="strike"/>
                <ToolbarButton icon="format_underlined" prop="underline"/>
                <ToolbarButton icon="code" prop="code"/>
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