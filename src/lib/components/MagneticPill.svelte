<script lang="ts">
	import { poseTransform } from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type Props = HTMLAnchorAttributes & {
		variant?: 'primary' | 'secondary';
		children: Snippet;
	};

	let { variant = 'primary', children, href, class: className = '', ...rest }: Props = $props();

	const spring = new MagnetSpring();

	$effect(() => () => spring.destroy());
</script>

<a
	class="pill {variant} {className}"
	{href}
	{...rest}
	onmousemove={(event) => spring.move(event)}
	onmouseleave={() => spring.release()}
	onblur={() => spring.release()}
>
	<span class="pill-magnet" style:transform={poseTransform(spring.pose)} aria-hidden="true">
		<span class="pill-face"></span>
	</span>
	<span class="pill-label">{@render children()}</span>
</a>

<style>
	.pill {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		padding: 0 20px;
		border-radius: 999px;
		font-size: 0.95rem;
		font-weight: var(--font-weight);
		line-height: 1;
		text-decoration: none;
		box-sizing: border-box;
		user-select: none;
		-webkit-user-drag: none;
		overflow: visible;
	}

	.pill:hover {
		text-decoration: none;
	}

	.pill-magnet {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
	}

	.pill:hover .pill-magnet,
	.pill:focus-visible .pill-magnet {
		will-change: transform;
	}

	.pill-face {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: inherit;
		transition:
			background-color 160ms ease,
			box-shadow 160ms ease;
	}

	.pill-label {
		position: relative;
		z-index: 1;
	}

	.pill.primary {
		color: var(--color-bg);
	}

	.pill.primary .pill-face {
		background: var(--color-text);
	}

	.pill.primary:hover .pill-face {
		opacity: 0.92;
	}

	.pill.secondary {
		color: var(--color-text);
	}

	.pill.secondary .pill-face {
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
	}

	.pill.secondary:hover .pill-face {
		background: color-mix(in srgb, var(--color-text) 16%, var(--color-bg));
	}
</style>
