<script lang="ts">
	import { getContext } from 'svelte';
	import { Button, IconButton, Render } from 'nunui';

	const editor = getContext<{ v: any }>('editor');
	const tiptap = $derived(editor.v);

	let {
		prop = '',
		attrs = '',
		label = '',
		icon = '',
		methodName = 'toggle' + prop.charAt(0).toUpperCase() + prop.slice(1),
		tooltip,
		handler,
		...rest
	} = $props();

	const isActive = $derived(() => {
		return editor && prop && tiptap.isActive(prop, attrs);
	});

	function toggle() {
		if (!tiptap) return;
		//tiptap.chain().focus().clearNodes().run()
		if (handler) return handler();
		setTimeout(() => tiptap.chain().focus()[methodName](attrs)?.run(), 0);
	}
</script>

{#if icon}
	<IconButton size="1.2em" {icon} active={isActive()} onclick={toggle} {tooltip} tabindex="0" />
{:else}
	<Button outlined={!isActive()} onclick={handler || toggle} small {...rest}>
		{label}
		<Render it={children} />
	</Button>
{/if}
