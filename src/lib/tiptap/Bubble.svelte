<script lang="ts">
    import {BubbleMenu} from "svelte-tiptap";
    import {getContext} from "svelte";
    import 'tippy.js/animations/shift-away-subtle.css';
    import ToolbarButton from "$lib/tiptap/ToolbarButton.svelte";

    const tiptap = getContext<any>('editor');
</script>


{#if $tiptap}
    <BubbleMenu editor={$tiptap}
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
    background: var(--surface);
    padding: 8px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(127, 127, 127, 0.07),
    0 2px 4px rgba(127, 127, 127, 0.07),
    0 4px 8px rgba(127, 127, 127, 0.07),
    0 8px 16px rgba(127, 127, 127, 0.07),
    0 16px 32px rgba(127, 127, 127, 0.07),
    0 32px 64px rgba(127, 127, 127, 0.07);
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