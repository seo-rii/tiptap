<script lang="ts">
    import TipTap from "$lib/tiptap/TipTap.svelte";
    import {ThemeProvider, Checkbox, Input} from "nunui";

    let body = 'Hello, world!', editor = true;
</script>

<ThemeProvider>
    <TipTap bind:body {editor}/>
    <br>
    <Checkbox bind:checked={editor} label="editor"/>
    <br>
    <Input placeholder="html" multiline bind:value={body}/>
</ThemeProvider>