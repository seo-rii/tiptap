<script lang="ts">
	import TipTap from '$lib/tiptap/TipTap.svelte';
	import { Checkbox, Input } from 'nunui';

	let body = $state(
		`<h2>Hello, World!</h2><p>This is Simple WYSIWYG editor based on <a target="_blank" rel="noopener noreferrer nofollow" href="https://tiptap.dev">TipTap</a>, and customized by <a target="_blank" rel="noopener noreferrer nofollow" href="https://seorii.page">@seo-rii</a>.</p><p>Click here and type anything!</p><blockquote><p>Or how about drag something, or make a new line and press "/"?</p></blockquote><h2>Get started</h2><pre><code>npm i @seorii/tiptap</code></pre><pre><code>&lt;script lang="ts"&gt;
    import TipTap from "$lib/tiptap/TipTap.svelte";

    let body = "&lt;p&gt;Hello, World!&lt;/p&gt;", editable = true, ref;
&lt;/script&gt;

&lt;TipTap bind:ref bind:body {editable}/&gt;</code></pre><p>That's all!</p>`
	);
	let editable = $state(true);
	let docked = $state(false);
</script>

<TipTap
	bind:body
	{editable}
	mark
	bubbleDocked={docked}
	imageUpload={async (image) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return URL.createObjectURL(image);
	}}
/>
<br />
<Checkbox bind:checked={editable} label="editable" />
<br />
<Checkbox bind:checked={docked} label="docked toolbar" />
<br />
<Input placeholder="html" multiline bind:value={body} />

<style>
	@import 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/default.min.css';

	:global(blockquote) {
		border-left: 3px solid var(--primary-light8);
		margin: 0;
		padding-left: 10px;
		color: var(--primary-dark8);
	}
</style>
