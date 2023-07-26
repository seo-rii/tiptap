<script lang="ts">
    import TipTap from "$lib/tiptap/TipTap.svelte";

    let body = 'Hello, world!';
</script>

<TipTap bind:body/>

{body}