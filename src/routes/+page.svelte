<script lang="ts">
    import TipTap from "$lib/tiptap/TipTap.svelte";
    import {Checkbox, Input} from "nunui";

    let body = '<p>Hello, World!</p><p>This is Simple WYSIWYG editor based on <a target="_blank" rel="noopener noreferrer nofollow" href="https://tiptap.dev">TipTap</a> by <a target="_blank" rel="noopener noreferrer nofollow" href="https://seorii.page">@seo-rii</a>.</p><p>Click here and type anything!</p><p>Or how about make a new line and press "/"?</p>',
        editor = true;
</script>

<TipTap bind:body {editor}/>
<br>
<Checkbox bind:checked={editor} label="editable"/>
<br>
<Input placeholder="html" multiline bind:value={body}/>