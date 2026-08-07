<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { navItems } from '$lib/data';

	import { poseTransform } from '$lib/magnet';
	import { MagnetSpring } from '$lib/magnetSpring.svelte';

	const DOT = 6;
	const GUTTER = 16;

	let navEl: HTMLElement | undefined = $state();
	let shape = $state({ x: 0, y: 0, w: DOT, h: DOT, r: DOT / 2 });
	const spring = new MagnetSpring();
	let ready = $state(false);
	let hoveredHref: string | null = $state(null);
	let pressed = $state(false);
	/** Keeps the dot on the chosen item until navigation finishes. */
	let selecting = $state(false);
	/** Play lock-in after navigation settles — reliable for quick clicks. */
	let pendingLock = $state(false);
	let locking = $state(false);
	let lockKey = $state(0);

	/** Pill when hovering a non-active item — collapses to a dot while pressed/selecting. */
	let showPill = $derived(
		hoveredHref !== null && !isActive(hoveredHref) && !pressed && !selecting
	);

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(`${href}/`);
	}

	function moveIndicatorTo(target: HTMLElement | null | undefined, asPill: boolean) {
		if (!navEl || !target) return;

		const navRect = navEl.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();
		const x = targetRect.left - navRect.left;
		const y = targetRect.top - navRect.top;

		if (asPill) {
			shape = {
				x,
				y,
				w: targetRect.width,
				h: targetRect.height,
				r: targetRect.height / 2
			};
		} else {
			shape = {
				x: (GUTTER - DOT) / 2,
				y: y + targetRect.height / 2 - DOT / 2,
				w: DOT,
				h: DOT,
				r: DOT / 2
			};
		}

		ready = true;
	}

	function updateIndicator() {
		if (!navEl) return;

		const targetHref =
			hoveredHref ?? navItems.find((item) => isActive(item.href))?.href ?? null;
		if (!targetHref) return;

		const target = navEl.querySelector<HTMLElement>(`[data-nav-href="${targetHref}"]`);
		moveIndicatorTo(target, showPill);
	}

	function onLinkEnter(href: string) {
		if (selecting) return;
		hoveredHref = href;
		updateIndicator();
	}

	function onLinkMove(event: MouseEvent, href: string) {
		if (selecting || isActive(href) || pressed) {
			spring.reset();
			return;
		}

		spring.move(event);
	}

	function onNavLeave() {
		if (selecting) return;
		hoveredHref = null;
		pressed = false;
		spring.release();
		updateIndicator();
	}

	function markSelection(href: string) {
		if (isActive(href) || selecting) return;
		selecting = true;
		pendingLock = true;
		hoveredHref = href;
		pressed = false;
		spring.reset();
		// Keep the pill→dot morph if press already started it; otherwise collapse with transition.
		updateIndicator();
	}

	function onPressStart(href: string) {
		if (isActive(href) || selecting) return;
		pressed = true;
		spring.reset();
		// Morph the hover pill into the gutter dot (works for hold and quick click).
		updateIndicator();
	}

	function releasePress(commit: boolean) {
		if (!pressed || selecting) return;

		pressed = false;

		// Commit is handled by click — mouseup only restores hover if the press was cancelled.
		if (!commit) {
			updateIndicator();
		}
	}

	function onItemClick(href: string) {
		markSelection(href);
	}

	function triggerLock() {
		locking = false;
		lockKey += 1;
		requestAnimationFrame(() => {
			locking = true;
		});
	}

	function onLockEnd() {
		locking = false;
	}

	afterNavigate(() => {
		selecting = false;
		pressed = false;

		if (pendingLock) {
			pendingLock = false;
			// Wait for the active item swap + layout before locking in.
			requestAnimationFrame(() => {
				updateIndicator();
				triggerLock();
			});
		} else {
			queueMicrotask(updateIndicator);
		}
	});

	$effect(() => {
		page.url.pathname;
		hoveredHref;
		pressed;
		selecting;
		showPill;
		queueMicrotask(updateIndicator);
	});

	$effect(() => () => spring.destroy());
</script>

<svelte:window
	onresize={updateIndicator}
	onmouseup={() => releasePress(Boolean(hoveredHref))}
	onblur={() => releasePress(false)}
/>

<nav class="nav" aria-label="Primary" bind:this={navEl} onmouseleave={onNavLeave}>
	<span
		class="indicator"
		class:ready
		class:pill={showPill}
		style:transform="translate({shape.x}px, {shape.y}px)"
		style:width="{shape.w}px"
		style:height="{shape.h}px"
		style:border-radius="{shape.r}px"
		aria-hidden="true"
	>
		<span class="indicator-magnet" style:transform={poseTransform(spring.pose)}>
			<span
				class="indicator-face"
				class:locking
				data-lock-key={lockKey}
				onanimationend={onLockEnd}
			></span>
		</span>
	</span>

	<ul>
		{#each navItems as item (item.href)}
			{@const active = isActive(item.href)}
			<li onmouseenter={() => onLinkEnter(item.href)}>
				{#if active}
					<span class="item current" data-nav-href={item.href} aria-current="page">
						{item.label}
					</span>
				{:else}
					<a
						class="item"
						href={item.href}
						draggable="false"
						data-nav-href={item.href}
						data-hot={hoveredHref === item.href && !selecting ? '' : undefined}
						onfocus={() => onLinkEnter(item.href)}
						onblur={onNavLeave}
						onmousemove={(event) => onLinkMove(event, item.href)}
						onmousedown={() => onPressStart(item.href)}
						onmouseup={() => releasePress(true)}
						onmouseleave={() => releasePress(false)}
						ondragstart={(event) => event.preventDefault()}
						onclick={() => onItemClick(item.href)}
					>
						{item.label}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</nav>

<style>
	.nav {
		--gutter: 16px;
		position: relative;
		/* Stay live during page transitions — VT snapshots were fighting the indicator. */
		view-transition-name: none;
		width: fit-content;
		padding-left: var(--gutter);
		user-select: none;
		-webkit-user-drag: none;
	}

	ul {
		position: relative;
		z-index: 1;
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0;
	}

	.item {
		display: inline-block;
		padding: 2px 0.75rem;
		border-radius: 999px;
		color: var(--color-text);
		opacity: 0.4;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		text-decoration: none;
		transition: opacity 220ms ease;
	}

	a.item:hover,
	a.item[data-hot] {
		opacity: 1;
		text-decoration: none;
	}

	.item.current {
		opacity: 1;
	}

	.indicator {
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0;
		pointer-events: none;
		transition:
			transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
			width 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
			height 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
			border-radius 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
			opacity 180ms ease;
	}

	.indicator.ready {
		opacity: 1;
	}

	.indicator-magnet {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: inherit;
	}

	.indicator-face {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: inherit;
		background: var(--color-text);
		transform-origin: center;
		transition: background-color 280ms ease;
	}

	.indicator.pill .indicator-face {
		background: color-mix(in srgb, var(--color-text) 10%, transparent);
	}

	.indicator-face.locking {
		animation: lock-blink 280ms ease;
	}

	@keyframes lock-blink {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		35% {
			opacity: 0.25;
			transform: scale(0.85);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@media (max-width: 800px) {
		.nav {
			width: 100%;
			padding-left: 0;
		}

		ul {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.15rem 0.2rem;
		}

		.item {
			padding: 0.4rem 0.7rem;
		}

		/* Vertical gutter-dot doesn't map to a horizontal row. */
		.indicator {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.indicator,
		.indicator-magnet,
		.indicator-face,
		a {
			transition: none;
		}

		.indicator-face.locking {
			animation: none;
		}
	}
</style>
