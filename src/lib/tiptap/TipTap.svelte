<script lang="ts">
    import {browser} from "$app/environment";
    import {beforeUpdate, onMount, setContext} from 'svelte'
    import {writable} from "svelte/store";
    import sanitizeHtml from 'sanitize-html';
    import "@seorii/prosemirror-math/style.css";
    import Bubble from "$lib/tiptap/Bubble.svelte";
    import Floating from "$lib/tiptap/Floating.svelte";
    import Command from "$lib/tiptap/Command.svelte";
    import {slashItems, slashProps, slashVisible} from "$lib/plugin/command/stores";
    import i18n from "$lib/i18n";
    import type {UploadFn} from "$lib/plugin/image/dragdrop";
    import {fallbackUpload} from "$lib/plugin/image/dragdrop";

    const san = (body: string) => sanitizeHtml(body, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'math-inline', 'math-node', 'iframe', 'tiptap-file', 'lite-youtube', 'blockquote']),
        allowedStyles: <any>'*', allowedAttributes: {
            '*': ['style', 'class'],
            a: ['href', 'name', 'target'],
            img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
            iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
            th: ['colwidth', 'colspan', 'rowspan'],
            td: ['colwidth', 'colspan', 'rowspan'],
            'tiptap-file': ['id'],
            'lite-youtube': ['videoid', 'params', 'nocookie', 'title', 'provider'],
        },
    })

    export let body = '', editable = false, ref = null, options = {}
    export let imageUpload: UploadFn = fallbackUpload, style = ''
    export let blocks = []
    const tiptap = setContext('editor', writable<any>(null))
    let element: Element, fullscreen = false, mounted = false, last = ''

    $: $tiptap && $tiptap.setEditable(editable)
    $: browser && ((<any>window).__image_uploader = imageUpload)
    $: browser && ((<any>window).__tiptap_blocks = blocks)

    if (browser) {
        onMount(() => {
            body = last = san(body)
            mounted = true
            Promise.all([import('./tiptap'), import("@justinribeiro/lite-youtube")]).then(([{default: tt}]) => {
                if (!mounted) return;
                ref = $tiptap = tt(element, body, {
                    editable: editable,
                    onTransaction: () => ref = $tiptap = $tiptap,
                    ...options,
                });
                $tiptap.on('update', ({editor: tiptap}: any) => {
                    let content = tiptap.getHTML(), json = tiptap.getJSON().content
                    if (Array.isArray(json) && json.length === 1 && !json[0].hasOwnProperty("content")) content = null
                    body = last = content
                });
            })

            return () => {
                mounted = false
                $tiptap?.destroy?.()
            }
        });

        beforeUpdate(() => {
            if (last === body) return
            body = san(body)
            $tiptap?.commands?.setContent?.(body)
        })
    }

    let selectedIndex = 0;
    $: selectedIndex = $slashVisible ? selectedIndex : 0;

    function handleKeydown(event) {
        if (!$slashVisible) return;
        let count = $slashItems.length;
        if ($slashItems[0]?.list) count = $slashItems.reduce((acc, item) => acc + item.list.length, 0);
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex + count - 1) % count;
            return true;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % count;
            return true;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            selectItem(selectedIndex);
            return true;
        }

        return false;
    }

    function selectItem(index) {
        const item = $slashItems[0]?.list ? $slashItems.map(i => i.list).flat()[index] : $slashItems[index];
        if (item) {
            let range = $slashProps.range;
            item.command({editor: $tiptap, range});
        }
    }
</script>

<main class:fullscreen class:editable>
    <div class="wrapper">
        <div bind:this={element} class="target" on:keydown|capture={handleKeydown}></div>
        {#if !$tiptap}
            {i18n('loading')}
        {/if}
    </div>
    {#if editable}
        <Command {selectedIndex}/>
        <Floating/>
        {#if $$slots.bubble}
            <Bubble>
                <slot name="bubble"/>
            </Bubble>
        {:else}
            <Bubble/>
        {/if}
    {/if}
</main>


<style lang="scss">
  main {
    position: relative;
    overscroll-behavior: none;
    --shadow: 0 1px 2px rgba(127, 127, 127, 0.07),
    0 2px 4px rgba(127, 127, 127, 0.07),
    0 4px 8px rgba(127, 127, 127, 0.07),
    0 8px 16px rgba(127, 127, 127, 0.07),
    0 16px 32px rgba(127, 127, 127, 0.07),
    0 32px 64px rgba(127, 127, 127, 0.07);

    &.fullscreen {
      z-index: 999999999;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--surface);
      padding: 82px 12px 12px 12px;
    }

    .wrapper {
      position: relative;
    }
  }

  .target > :global(div) {
    & > :global(*:first-child) {
      margin-top: 0 !important;
    }

    & > :global(*:last-child) {
      margin-bottom: 0 !important;
    }
  }

  .editable :global(.ProseMirror-selectednode img) {
    transition: all 0.2s ease-in-out;
    filter: drop-shadow(0 0 0.75rem var(--primary-light13));
  }

  .editable :global(.iframe-wrapper.ProseMirror-selectednode) {
    outline: 3px solid var(--primary);
  }

  div > :global(div) {
    outline: none !important;

    :global {
      .ProseMirror p.is-editor-empty:first-child::before {
        color: #adb5bd;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }

      a {
        cursor: pointer;
      }

      img {
        transition: all 0.2s ease-in-out;
        max-width: 100%;
        border-radius: 12px;
        position: relative;
      }

      code.inline {
        background: var(--primary-light1);
        padding: 2px 4px;
        border-radius: 4px;
      }

      pre {
        background: var(--primary-light1);
        padding: 12px;
        border-radius: 12px;
        max-width: 100%;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        border: 1px solid var(--primary-light1);
        border-radius: 12px;

        th, td {
          padding: 8px;
          border: 1px solid var(--primary-light1);
        }
      }

      .math-render {
        cursor: initial;
      }

      .iframe-wrapper {
        position: relative;
        padding-bottom: 12px;
        overflow: hidden;
        width: 100%;
        height: 600px;
        border-radius: 12px;

        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      }
    }
  }
</style>