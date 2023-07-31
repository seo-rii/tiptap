<script lang="ts">
    import {getContext} from "svelte";
    import {Button, IconButton} from "nunui";

    const editor = getContext("editor");

    export let prop = '', attrs = '', label = '', icon = '',
        methodName = 'toggle' + prop.charAt(0).toUpperCase() + prop.slice(1),
        tooltip, handler;

    $: isActive = () => {
        return editor && $editor.isActive(prop, attrs);
    }

    function toggle() {
        if (!$editor) return
        setTimeout(() => $editor.chain().focus()[methodName](attrs)?.run(), 0)
    }
</script>

{#if icon}
    <IconButton size="1.2em" {icon} active={isActive()} on:click={handler || toggle} tooltip={tooltip} tabindex="0"/>
{:else}
    <Button outlined={!isActive()} on:click={handler || toggle} small>
        {label}
        <slot/>
    </Button>
{/if}

