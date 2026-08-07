<script lang="ts">
	import { browser } from '$app/environment';
	import { poseTransform } from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';
	import { isBorrowed } from '$lib/videoHost';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		/** Pinterest-style height variant; `wide` = 16:9 */
		size?: 'tall' | 'mid' | 'short' | 'wide';
		lifted?: boolean;
		video?: string;
		/** Optional WebM source (preferred when supported). */
		videoWebm?: string;
		/** Still shown before the video is near the viewport / loaded. */
		poster?: string;
		title?: string;
		description?: string;
	};

	let {
		size = 'mid',
		lifted = false,
		video,
		videoWebm,
		poster,
		title,
		description,
		class: className = '',
		children,
		...rest
	}: Props & { children?: import('svelte').Snippet } = $props();

	const spring = new MagnetSpring();
	let hovering = $state(false);
	let inView = $state(false);
	let mediaReady = $state(false);
	let videoEl: HTMLVideoElement | undefined = $state();
	let faceEl: HTMLSpanElement | undefined = $state();
	let shellEl: HTMLSpanElement | undefined = $state();

	const reduceMotion =
		browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function onMove(event: MouseEvent) {
		if (lifted) return;
		hovering = true;
		spring.move(event, undefined, shellEl);
	}

	function onLeave() {
		hovering = false;
		spring.release();
	}

	/** Imperative <video> so the sheet can borrow the node without Svelte reclaiming it. */
	$effect(() => {
		if (!browser || !faceEl || !video || reduceMotion) return;

		const el = document.createElement('video');
		el.className = 'card-video';
		el.muted = true;
		el.defaultMuted = true;
		el.playsInline = true;
		el.loop = true;
		el.preload = 'none';
		el.setAttribute('playsinline', '');
		el.setAttribute('webkit-playsinline', '');
		el.setAttribute('muted', '');
		if (poster) el.setAttribute('poster', poster);
		faceEl.appendChild(el);
		videoEl = el;

		return () => {
			if (!isBorrowed(el)) el.remove();
			if (videoEl === el) videoEl = undefined;
		};
	});

	/** Near-viewport gate — decode only when the card is about to be seen. */
	$effect(() => {
		if (!browser || !shellEl || !video || reduceMotion) return;
		const io = new IntersectionObserver(
			([entry]) => {
				inView = Boolean(entry?.isIntersecting);
			},
			{ rootMargin: '120px 0px', threshold: 0.05 }
		);
		io.observe(shellEl);
		return () => io.disconnect();
	});

	$effect(() => {
		if (!videoEl || !video || reduceMotion) return;
		if (lifted || isBorrowed(videoEl)) return;

		if (inView) {
			const existing = videoEl.querySelector('source[type="video/mp4"]') as HTMLSourceElement | null;
			const needsLoad = !existing || existing.src !== new URL(video, location.href).href;
			if (needsLoad) {
				videoEl.replaceChildren();
				if (videoWebm) {
					const webm = document.createElement('source');
					webm.src = videoWebm;
					webm.type = 'video/webm';
					videoEl.appendChild(webm);
				}
				const mp4 = document.createElement('source');
				mp4.src = video;
				mp4.type = 'video/mp4';
				videoEl.appendChild(mp4);
				videoEl.preload = 'auto';
				mediaReady = false;
				videoEl.load();
			}
			const onReady = () => {
				mediaReady = true;
			};
			videoEl.addEventListener('loadeddata', onReady, { once: true });
			if (videoEl.readyState >= 2) mediaReady = true;
			void videoEl.play().catch(() => {});
			return () => videoEl?.removeEventListener('loadeddata', onReady);
		}

		videoEl.pause();
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
	class:media-ready={mediaReady}
	{...rest}
	onmousemove={onMove}
	onmouseleave={onLeave}
	onblur={onLeave}
>
	<span class="card-shell" bind:this={shellEl} data-project-origin>
		<span class="card-magnet" class:sprung={hovering} style:transform={poseTransform(spring.pose)}>
			<span
				class="card-face"
				bind:this={faceEl}
				aria-hidden="true"
				data-video-home
				style:background-image={poster ? `url(${poster})` : undefined}
			></span>
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

	.card:focus {
		outline: none;
	}

	/* Focus ring on the media thumb only — not title/description below. */
	.card:focus-visible .card-shell {
		outline: 2px solid #5b9dd9;
		outline-offset: 3px;
	}

	.card-shell {
		position: relative;
		display: block;
		width: 100%;
		height: 18rem;
		border-radius: 1.75rem;
		/* Magnet translate/rotate must be allowed to spill past the shell. */
		overflow: visible;
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

	/* Transform lives here — keep overflow visible so cursor follow isn't clipped. */
	.card-magnet {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: visible;
	}

	.card-magnet.sprung {
		will-change: transform;
	}

	/* Round + clip media only; never the magnet layer. */
	.card-face {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background-color: color-mix(in srgb, var(--color-text) 9%, var(--color-bg));
		background-size: cover;
		background-position: center;
		overflow: hidden;
		transition: background-color 160ms ease;
	}

	.card-face :global(.card-video) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
		opacity: 0;
		transition: opacity 180ms ease;
	}

	.card.media-ready .card-face :global(.card-video) {
		opacity: 1;
	}

	.card.hot .card-face {
		background-color: color-mix(in srgb, var(--color-text) 13%, var(--color-bg));
	}

	/* Hide only the media shell — title/description stay so the close morph
	   lands on a complete thumbnail, not an empty card. */
	.card.lifted .card-shell {
		opacity: 0;
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
</style>
