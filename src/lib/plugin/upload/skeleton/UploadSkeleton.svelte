<script lang="ts">
	import { NodeViewWrapper } from 'svelte-tiptap';
	import type { NodeViewProps } from '@tiptap/core';

	type UploadSkeletonProps = Pick<NodeViewProps, 'node'>;
	let { node }: UploadSkeletonProps = $props();

	const kind = $derived.by(() => {
		const raw = node.attrs?.kind;
		return typeof raw === 'string' && raw.trim().length ? raw : 'block';
	});
	const frameHeight = $derived.by(() => {
		const raw = Number.parseFloat(String(node.attrs?.height ?? ''));
		const base = Number.isFinite(raw) ? raw : 180;
		return Math.max(44, Math.min(1200, Math.round(base)));
	});
</script>

<NodeViewWrapper>
	<div class="wrapper" data-kind={kind} style={`height: ${frameHeight}px`}>
		<div class="shine"></div>
		<div class="bar top"></div>
		<div class="bar mid"></div>
		<div class="bar low"></div>
	</div>
</NodeViewWrapper>

<style>
	.wrapper {
		position: relative;
		width: 100%;
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid var(--primary-light3, rgba(90, 90, 90, 0.25));
		background: linear-gradient(
			135deg,
			var(--surface2, rgba(120, 120, 120, 0.1)),
			var(--surface3, rgba(80, 80, 80, 0.2))
		);
	}

	.wrapper[data-kind='file'] {
		min-height: 56px;
	}

	.shine {
		position: absolute;
		inset: 0;
		transform: translateX(-120%);
		background: linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.36), transparent 80%);
		animation: shimmer 1.35s ease-in-out infinite;
	}

	.bar {
		position: absolute;
		left: 14px;
		right: 14px;
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.42);
	}

	.top {
		top: 14px;
		width: min(160px, 45%);
	}

	.mid {
		top: 34px;
		width: min(280px, 78%);
	}

	.low {
		top: 54px;
		width: min(220px, 62%);
	}

	.wrapper[data-kind='file'] .mid,
	.wrapper[data-kind='file'] .low {
		display: none;
	}

	.wrapper[data-kind='image'] .bar,
	.wrapper[data-kind='pdf'] .bar,
	.wrapper[data-kind='embed'] .bar {
		opacity: 0.78;
	}

	@keyframes shimmer {
		from {
			transform: translateX(-120%);
		}
		to {
			transform: translateX(120%);
		}
	}
</style>
