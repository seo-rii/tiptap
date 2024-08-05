<script lang="ts">
	import { Button, IconButton, List, OneLine, Paper } from 'nunui';

	export let block, view;
	const languages = ['', 'c', 'cpp', 'java', 'python', 'plaintext'];

	let copied = false;

	function copy() {
		navigator.clipboard.writeText(block.node.textContent);
		copied = true;
		setTimeout(() => copied = false, 1000);
	}

	function setLang(lang) {
		return () => {
			// dispatch to prosemirror to change attr of node
			const { tr } = view.state;
			const pos = block.pos;
			const node = block.node;
			const attrs = { ...node.attrs, language: lang };
			tr.setNodeMarkup(pos, null, attrs, node.marks);
			view.dispatch(tr);
		};
	}
</script>

<main>
<!--	<Paper right xstack bottom>-->
<!--		<Button small icon="language" slot="target" style="font-size: 0.8em"-->
<!--						outlined>{block.node.attrs?.language || 'auto'}</Button>-->
<!--		<List>-->
<!--			{#each languages as lang}-->
<!--				<OneLine title={lang || 'auto'} on:click={setLang(lang)} />-->
<!--			{/each}-->
<!--		</List>-->
<!--	</Paper>-->
	<IconButton icon={copied ? 'done' : 'content_copy'} on:click={copy} />
</main>

<style lang="scss">
  main {
    pointer-events: initial;
    display: flex;
    align-items: center;
  }
</style>