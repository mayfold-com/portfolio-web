<script lang="ts">
	import { poseTransform } from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';
	import { rememberVideoTime, resumeVideo } from '$lib/videoPlayback';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		/** Pinterest-style height variant; `wide` = 16:9 */
		size?: 'tall' | 'mid' | 'short' | 'wide';
		lifted?: boolean;
		video?: string;
		title?: string;
		description?: string;
	};

	let {
		size = 'mid',
		lifted = false,
		video,
		title,
		description,
		class: className = '',
		children,
		...rest
	}: Props & { children?: import('svelte').Snippet } = $props();

	const spring = new MagnetSpring();
	let hovering = $state(false);
	let videoEl: HTMLVideoElement | undefined = $state();
	let shellEl: HTMLSpanElement | undefined = $state();

	function onMove(event: MouseEvent) {
		if (lifted) return;
		hovering = true;
		spring.move(event, undefined, shellEl);
	}

	function onLeave() {
		hovering = false;
		spring.release();
	}

	$effect(() => {
		if (!videoEl || !video) return;
		if (lifted) {
			rememberVideoTime(video, videoEl);
			videoEl.pause();
			return;
		}
		resumeVideo(video, videoEl);
	});

	$effect(() => {
		if (lifted) {
			hovering = false;
			spring.reset();
		}
		return () => spring.destroy();
	});
</script>

<button
	type="button"
	class="card size-{size} {className}"
	class:lifted
	class:hot={hovering}
	class:has-video={Boolean(video)}
	{...rest}
	onmousemove={onMove}
	onmouseleave={onLeave}
	onblur={onLeave}
>
	<span class="card-shell" bind:this={shellEl} data-project-origin>
		<span class="card-magnet" style:transform={poseTransform(spring.pose)}>
			<span class="card-face" aria-hidden="true">
				{#if video}
					<video
						bind:this={videoEl}
						class="card-video"
						src={video}
						muted
						loop
						playsinline
						autoplay
						preload="auto"
					></video>
				{/if}
			</span>
			{#if children}
				<span class="card-content">{@render children()}</span>
			{/if}
		</span>
	</span>

	{#if title || description}
		<span class="card-meta">
			{#if title}<span class="card-name">{title}</span>{/if}
			{#if description}<span class="card-desc">{description}</span>{/if}
		</span>
	{/if}
</button>

<style>
	.card {
		position: relative;
		display: grid;
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-family: var(--font);
		font-variation-settings: var(--font-variation, normal);
		font-feature-settings: var(--font-features, normal);
		font-weight: var(--font-weight, 400);
		text-align: left;
		cursor: pointer;
		overflow: visible;
		user-select: none;
		-webkit-user-drag: none;
	}

	.card-shell {
		position: relative;
		display: block;
		width: 100%;
		height: 18rem;
		border-radius: 1.75rem;
	}

	.card.size-tall .card-shell {
		height: 26rem;
	}

	.card.size-mid .card-shell {
		height: 20rem;
	}

	.card.size-short .card-shell {
		height: 14rem;
	}

	.card.size-wide .card-shell {
		height: auto;
		aspect-ratio: 16 / 9;
	}

	.card-magnet {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: hidden;
		will-change: transform;
	}

	.card-face {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: color-mix(in srgb, var(--color-text) 9%, var(--color-bg));
		overflow: hidden;
		transition:
			background-color 160ms ease,
			box-shadow 160ms ease;
	}

	.card-video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.card.hot .card-face {
		background: color-mix(in srgb, var(--color-text) 13%, var(--color-bg));
		box-shadow: 0 18px 40px rgb(0 0 0 / 0.18);
	}

	/* Hide only the media shell — title/description stay so the close morph
	   lands on a complete thumbnail, not an empty card. */
	.card.lifted .card-shell {
		opacity: 0;
		transition: opacity 0s linear 140ms;
	}

	.card.lifted {
		pointer-events: none;
	}

	.card-content {
		position: relative;
		z-index: 1;
		display: block;
		height: 100%;
		padding: 1.25rem;
		box-sizing: border-box;
	}

	.card-meta {
		--card-radius: 1.75rem;
		display: grid;
		gap: 0.35rem;
		margin-top: 1.25rem;
		padding: 0 calc(var(--card-radius) / 2);
		transition: opacity 220ms ease;
	}

	.card-name {
		font-size: 0.92rem;
		font-weight: var(--font-weight);
		line-height: 1.45;
	}

	.card-desc {
		font-size: 0.92rem;
		line-height: 1.45;
		color: var(--color-text);
		opacity: 0.4;
	}

	@media (max-width: 800px) {
		.card.size-tall .card-shell,
		.card.size-mid .card-shell,
		.card.size-short .card-shell {
			height: 16rem;
		}

		.card.size-wide .card-shell {
			height: auto;
			aspect-ratio: 16 / 9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card-video {
			display: none;
		}
	}
</style>
