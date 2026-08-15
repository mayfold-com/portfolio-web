<script lang="ts">
	import { CHROME_MAGNET, poseTransform } from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';

	let {
		visible = false,
		tone = 'paper',
		hot = $bindable(false),
		onclick
	}: {
		visible?: boolean;
		tone?: 'paper' | 'media';
		hot?: boolean;
		onclick: () => void;
	} = $props();

	const spring = new MagnetSpring();

	$effect(() => {
		if (!visible) {
			spring.reset();
			hot = false;
		}
	});

	$effect(() => () => spring.destroy());
</script>

<button
	type="button"
	class="sheet-close"
	class:visible
	class:media={tone === 'media'}
	tabindex={visible ? 0 : -1}
	aria-label="Close"
	{onclick}
	onmouseenter={() => {
		hot = true;
	}}
	onmousemove={(event) => spring.move(event, CHROME_MAGNET)}
	onmouseleave={() => {
		hot = false;
		spring.release();
	}}
	onblur={() => {
		hot = false;
		spring.release();
	}}
>
	<span class="magnet" style:transform={poseTransform(spring.pose)}>
		<span class="face"></span>
		<svg viewBox="0 0 8 8" aria-hidden="true">
			<path
				d="M1.5 1.5l5 5M6.5 1.5l-5 5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.2"
				stroke-linecap="round"
			/>
		</svg>
	</span>
</button>

<style>
	.sheet-close {
		appearance: none;
		position: absolute;
		z-index: 9;
		top: calc(1.75rem - 24px);
		left: calc(1.75rem - 24px);
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		overflow: visible;
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sheet-close.media {
		color: #fff;
	}

	.sheet-close.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.magnet {
		position: relative;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		pointer-events: none;
		transform-origin: center;
	}

	.sheet-close:hover .magnet,
	.sheet-close:focus-visible .magnet {
		will-change: transform;
	}

	.face {
		position: absolute;
		inset: 0;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.05);
		backdrop-filter: blur(40px);
		-webkit-backdrop-filter: blur(40px);
		transition: background-color 140ms ease;
	}

	.sheet-close:hover .face {
		background: rgb(255 255 255 / 0.12);
	}

	svg {
		position: relative;
		display: block;
		width: 10px;
		height: 10px;
	}

	.sheet-close:focus-visible {
		outline: none;
	}

	.sheet-close:focus-visible .face {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	@media (max-width: 800px) {
		.sheet-close {
			top: 2rem;
			left: 50%;
			width: 56px;
			height: 56px;
			transform: translateX(-50%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet-close {
			transition: none;
		}
	}
</style>
