<script lang="ts">
	import {
		CARD_MAGNET_MAX,
		CARD_MAGNET_STRENGTH,
		CARD_ROTATE_MAX,
		poseTransform
	} from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const spring = new MagnetSpring();
	let hostEl: HTMLDivElement | undefined = $state();
	let hovering = $state(false);

	const magnetOpts = {
		strength: CARD_MAGNET_STRENGTH,
		max: CARD_MAGNET_MAX,
		rotateMax: CARD_ROTATE_MAX
	};

	$effect(() => () => spring.destroy());
</script>

<div
	class="case-magnet-host"
	class:hot={hovering}
	bind:this={hostEl}
	onmousemove={(event) => {
		hovering = true;
		spring.move(event, magnetOpts, hostEl);
	}}
	onmouseleave={() => {
		hovering = false;
		spring.release();
	}}
>
	<div class="case-magnet" style:transform={poseTransform(spring.pose)}>
		{@render children()}
	</div>
</div>

<style>
	.case-magnet-host {
		display: block;
		width: 100%;
		overflow: visible;
	}

	.case-magnet {
		transform-origin: center center;
		overflow: visible;
	}

	.case-magnet-host.hot .case-magnet {
		will-change: transform;
	}
</style>
