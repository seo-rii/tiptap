<script lang="ts">
    import {browser} from "$app/environment";
    import {onMount, setContext} from 'svelte'
    import {Card, Input} from "nunui";
    import {writable} from "svelte/store";
    import "tiptap-katex/style.css";
    import sanitizeHtml from 'sanitize-html';

    const san = (body: string, force = false) => (editor || force) ? body : sanitizeHtml(body, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'math-inline', 'iframe', 'tiptap-file']),
        allowedStyles: '*', allowedAttributes: {
            '*': ['style', 'class'],
            a: ['href', 'name', 'target'],
            img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
            iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
            'tiptap-file': ['id']
        },
    })

    export let body = '', editor = false, style = '', ref = null, options = {};
    const tiptap = setContext('editor', writable<any>(null));
    let element: Element, _body = san(body, true), fullscreen = false, html = false, mounted = false;

    $: ref = $tiptap;
    $: _san = san(body);
    $: if (_san !== _body && $tiptap) $tiptap?.commands.setContent(_body = _san);
    $: $tiptap && $tiptap.setEditable(editor);

    if (browser) onMount(() => {
        mounted = true;
        import('./tiptap').then(({default: tt}) => {
            if (!mounted) return;
            $tiptap = tt(element, _body, {
                editable: editor,
                onTransaction: () => $tiptap = $tiptap,
                ...options,
            });
            $tiptap.on('update', ({editor: tiptap}: any) => {
                let content = tiptap.getHTML(), json = tiptap.getJSON().content;
                if (Array.isArray(json) && json.length === 1 && !json[0].hasOwnProperty("content")) content = null;
                _body = body = editor ? content : body
            });
        })
        return () => {
            mounted = false;
            $tiptap?.destroy?.();
        }
    });
</script>

<Card outlined={editor}
      style="max-width:100%;margin-top:0;{editor ? '' : 'box-shadow:none;padding:0;border-radius:0;'}{style}">
    <main class:fullscreen class:editor>
        <div class="wrapper">
            <div bind:this={element} class:hide={html} class="target"></div>
            {#if !$tiptap}
                로드 중...
            {/if}
            <div class:hide={!html}>
                <Input multiline fullWidth placeholder="HTML" bind:value={body}/>
            </div>
        </div>
    </main>
</Card>

<style lang="scss">
  main {
    position: relative;
    overscroll-behavior: none;

    &.fullscreen {
      z-index: 9999999;
      position: fixed;
      top: 0;
      left: 0;
      background: var(--surface);
      padding: 82px 12px 12px 12px;
      width: calc(100% - 24px);
      height: calc(100% - 94px);
    }

    .wrapper {
      position: relative;

      .hide {
        display: none;
      }
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

  .editor :global(.ProseMirror-selectednode img) {
    transition: all 0.2s ease-in-out;
    filter: drop-shadow(0 0 0.75rem var(--primary-light13));
  }

  .editor .iframe-wrapper.ProseMirror-selectednode {
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

      img {
        transition: all 0.2s ease-in-out;
        max-width: 100%;
        border-radius: 12px;
        position: relative;
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