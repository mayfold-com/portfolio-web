<script lang="ts">
	import type { CaseTimelineRole } from '$lib/data';

	let {
		roles
	}: {
		roles: CaseTimelineRole[];
	} = $props();

	/** Start of a month as a decimal year. */
	function toDecimalYear(value: string) {
		const [year, month = '1'] = value.split('-');
		return Number(year) + (Number(month) - 1) / 12;
	}

	/** LinkedIn end months are inclusive; the bar should reach the start of the next month. */
	function toExclusiveEnd(value: string) {
		const [year, month = '1'] = value.split('-');
		const next = Number(month) === 12 ? `${Number(year) + 1}-01` : `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
		return toDecimalYear(next);
	}

	const span = $derived.by(() => {
		const starts = roles.map((role) => toDecimalYear(role.start));
		const ends = roles.map((role) => toExclusiveEnd(role.end));
		const from = Math.floor(Math.min(...starts));
		const to = Math.max(...ends);
		return { from, to };
	});

	const ticks = $derived(
		Array.from({ length: Math.floor(span.to) - span.from + 1 }, (_, i) => span.from + i)
	);

	/**
	 * Sequential titles meet, they do not stack. The handoff month belongs
	 * to the incoming role. Concurrent titles (Design System Lead) keep
	 * their full LinkedIn span.
	 */
	function barStart(role: CaseTimelineRole) {
		return toDecimalYear(role.start);
	}

	function barEnd(role: CaseTimelineRole) {
		let end = toExclusiveEnd(role.end);
		if (role.concurrent) return end;
		const next = roles
			.filter((other) => !other.concurrent && toDecimalYear(other.start) > toDecimalYear(role.start))
			.sort((a, b) => toDecimalYear(a.start) - toDecimalYear(b.start))[0];
		if (next) end = Math.min(end, toDecimalYear(next.start));
		return end;
	}

	function barOffset(role: CaseTimelineRole) {
		return barStart(role) - span.from;
	}

	function barDuration(role: CaseTimelineRole) {
		return Math.max(1 / 12, barEnd(role) - barStart(role));
	}

	/** Sequential titles share a row. Concurrent titles sit on their own row underneath. */
	const lanes = $derived.by(() => {
		const packed: CaseTimelineRole[][] = [];
		for (const role of roles) {
			const start = barStart(role);
			const end = barEnd(role);
			if (role.concurrent) {
				packed.push([role]);
				continue;
			}
			const lane = packed.find(
				(items) =>
					items.every((item) => {
						if (item.concurrent) return false;
						return barEnd(item) <= start || barStart(item) >= end;
					})
			);
			if (lane) lane.push(role);
			else packed.push([role]);
		}
		return packed;
	});

	function label(role: CaseTimelineRole) {
		return `${role.start.slice(0, 4)} – ${role.end.slice(0, 4)}`;
	}

	const THUMB_MIN = 36;

	let hostEl: HTMLElement | undefined = $state();
	let viewportEl: HTMLDivElement | undefined = $state();
	let canvasEl: HTMLDivElement | undefined = $state();
	let railEl: HTMLDivElement | undefined = $state();
	/** Cursor position in canvas space, so the marker sits under the pointer. */
	let markerX = $state<number | null>(null);
	let dragging = $state(false);
	let grabbedAt = 0;
	let grabbedScroll = 0;
	let thumb = $state({ left: 0, width: 0, visible: false });
	let thumbDragging = $state(false);
	let expanded = $state(false);
	let pinnedLatest = false;

	function pinToLatest() {
		const scroller = viewportEl;
		if (!scroller || pinnedLatest) return;
		const overflow = scroller.scrollWidth - scroller.clientWidth;
		if (overflow <= 1) return;
		scroller.scrollLeft = overflow;
		pinnedLatest = true;
	}

	function syncThumb() {
		const scroller = viewportEl;
		if (!scroller) {
			thumb = { left: 0, width: 0, visible: false };
			return;
		}
		const { scrollLeft, scrollWidth, clientWidth } = scroller;
		const overflow = scrollWidth - clientWidth;
		if (overflow <= 1 || clientWidth <= 0) {
			thumb = { left: 0, width: 0, visible: false };
			return;
		}
		const trackW = railEl?.clientWidth || clientWidth;
		const width = Math.min(trackW, Math.max(THUMB_MIN, trackW * (clientWidth / scrollWidth)));
		thumb = {
			left: (trackW - width) * (scrollLeft / overflow),
			width,
			visible: true
		};
	}

	function onThumbPointerDown(event: PointerEvent) {
		const scroller = viewportEl;
		if (!scroller || !thumb.visible) return;
		event.preventDefault();
		event.stopPropagation();

		const handle = event.currentTarget as HTMLElement;
		const startX = event.clientX;
		const startScroll = scroller.scrollLeft;
		const overflow = scroller.scrollWidth - scroller.clientWidth;
		const trackW = railEl?.clientWidth || scroller.clientWidth;
		const travel = Math.max(1, trackW - thumb.width);

		thumbDragging = true;
		try {
			handle.setPointerCapture(event.pointerId);
		} catch {
			// Capture is a nicety.
		}

		const onMove = (moveEvent: PointerEvent) => {
			if (!viewportEl) return;
			const delta = ((moveEvent.clientX - startX) / travel) * overflow;
			viewportEl.scrollLeft = Math.min(overflow, Math.max(0, startScroll + delta));
		};

		const onUp = () => {
			thumbDragging = false;
			handle.removeEventListener('pointermove', onMove);
			handle.removeEventListener('pointerup', onUp);
			handle.removeEventListener('pointercancel', onUp);
		};

		handle.addEventListener('pointermove', onMove);
		handle.addEventListener('pointerup', onUp);
		handle.addEventListener('pointercancel', onUp);
	}

	function onExpandPointerDown(event: PointerEvent) {
		event.stopPropagation();
	}

	function onExpandClick(event: MouseEvent) {
		event.stopPropagation();
		expanded = !expanded;
	}

	$effect(() => {
		const scroller = viewportEl;
		if (!scroller) return;
		const sync = () => {
			pinToLatest();
			syncThumb();
		};
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(scroller);
		if (canvasEl) ro.observe(canvasEl);
		if (hostEl) ro.observe(hostEl);
		return () => ro.disconnect();
	});

	function localX(clientX: number) {
		if (!hostEl) return 0;
		const rect = hostEl.getBoundingClientRect();
		return Math.min(Math.max(clientX - rect.left, 0), hostEl.clientWidth);
	}

	function track(event: PointerEvent) {
		if (dragging && viewportEl) {
			viewportEl.scrollLeft = grabbedScroll - (event.clientX - grabbedAt);
		}
		markerX = localX(event.clientX);
	}

	/** Grab anywhere on the timeline to pan it sideways. */
	function grab(event: PointerEvent) {
		// Keep the sheet's own drag gestures out of it.
		event.stopPropagation();
		if (!viewportEl) return;
		dragging = true;
		grabbedAt = event.clientX;
		grabbedScroll = viewportEl.scrollLeft;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// Capture is a nicety; panning still works without it.
		}
	}

	function release() {
		dragging = false;
	}
</script>

<div class="timeline-wrap" class:expanded>
	<figure class="role-timeline" bind:this={hostEl}>
	<button
		type="button"
		class="expand-btn"
		aria-expanded={expanded}
		aria-label={expanded ? 'Collapse timeline' : 'Expand timeline'}
		onpointerdown={onExpandPointerDown}
		onclick={onExpandClick}
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path class="corner" d="M5 2.5H2.5V5" />
			<path class="corner" d="M11 2.5h2.5V5" />
			<path class="corner" d="M5 13.5H2.5V11" />
			<path class="corner" d="M11 13.5h2.5V11" />
		</svg>
	</button>

	<div class="viewport" bind:this={viewportEl} onscroll={syncThumb}>
		<div
			bind:this={canvasEl}
			class="canvas"
			class:dragging
			style:--years={span.to - span.from}
			onpointermove={track}
			onpointerleave={() => (markerX = null)}
			onpointerdown={grab}
			onpointerup={release}
			onpointercancel={release}
			role="presentation"
		>
			<div class="axis">
				{#each ticks as tick (tick)}
					<span class="tick" style:--at={tick - span.from}>{tick}</span>
				{/each}
			</div>

			<ol class="rows">
				{#each lanes as lane (lane.map((role) => role.role).join())}
					<li class="row">
						{#each lane as role (role.role)}
							<div
								class="bar"
								style:--at={barOffset(role)}
								style:--dur={barDuration(role)}
							>
								<span class="title">{role.role}</span>
								<span class="years">{label(role)}</span>
							</div>
						{/each}
					</li>
				{/each}
			</ol>
		</div>
	</div>

	{#if markerX !== null}
		<div class="marker" aria-hidden="true" style:--x="{markerX}px"></div>
	{/if}

	<div
		bind:this={railEl}
		class="scroll-rail"
		class:visible={thumb.visible}
		aria-hidden="true"
	>
		<button
			type="button"
			class="scroll-thumb"
			class:dragging={thumbDragging}
			tabindex="-1"
			style:transform="translate3d({thumb.left}px, 0, 0)"
			style:width="{thumb.width}px"
			aria-label="Scroll timeline"
			onpointerdown={onThumbPointerDown}
		></button>
	</div>
</figure>
</div>

<style>
	.timeline-wrap {
		--expand-ease: cubic-bezier(0.2, 0.9, 0.2, 1);
		--expand-ms: 320ms;
		width: 100cqw;
		max-width: none;
		margin: 0 0 2.75rem;
		margin-left: calc(50% - 50cqw);
		pointer-events: none;
	}

	.role-timeline {
		--year-w: 15.5rem;
		--inset: 1.25rem;
		--axis-h: 2.25rem;
		--row-h: 3rem;
		width: 100%;
		max-width: var(--span-4);
		margin: 0 auto;
		position: relative;
		padding: 1.25rem 0 1.75rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
		overflow: hidden;
		box-sizing: border-box;
		pointer-events: auto;
		transition:
			max-width var(--expand-ms) var(--expand-ease),
			border-radius var(--expand-ms) var(--expand-ease);
	}

	.timeline-wrap.expanded .role-timeline {
		max-width: 100%;
		border-radius: 0;
	}

	.expand-btn {
		position: absolute;
		top: 0.7rem;
		right: 0.7rem;
		z-index: 4;
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-bg) 62%, transparent);
		backdrop-filter: blur(40px);
		-webkit-backdrop-filter: blur(40px);
		cursor: pointer;
		transition: background-color 180ms ease;
	}

	.expand-btn:hover {
		background: color-mix(in srgb, var(--color-bg) 78%, transparent);
	}

	.expand-btn:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-text) 45%, transparent);
		outline-offset: 2px;
	}

	.expand-btn svg {
		display: block;
		width: 0.95rem;
		height: 0.95rem;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.expand-btn .corner {
		transform-box: fill-box;
		transform-origin: center;
		transition: transform 280ms var(--expand-ease);
	}

	.expand-btn[aria-expanded='true'] .corner {
		transform: rotate(180deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.role-timeline,
		.expand-btn .corner {
			transition: none;
		}
	}

	.viewport {
		position: relative;
		z-index: 0;
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	.viewport::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	.scroll-rail {
		position: absolute;
		right: 1.25rem;
		bottom: 0.7rem;
		left: 1.25rem;
		height: 4px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 220ms ease;
	}

	.scroll-rail.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.scroll-thumb {
		position: absolute;
		top: 0;
		left: 0;
		height: 4px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-text) 55%, transparent);
		cursor: grab;
		touch-action: none;
		transition: background-color 180ms ease;
	}

	.scroll-thumb:hover,
	.scroll-thumb.dragging {
		background: color-mix(in srgb, var(--color-text) 75%, transparent);
	}

	.scroll-thumb.dragging {
		cursor: grabbing;
	}

	.canvas {
		position: relative;
		width: calc(var(--years) * var(--year-w) + var(--inset) * 2);
		padding-bottom: 0.5rem;
		cursor: grab;
		touch-action: pan-x;
	}

	.canvas.dragging {
		cursor: grabbing;
		user-select: none;
	}

	.axis {
		position: relative;
		height: var(--axis-h);
		border-bottom: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
		font-size: 0.85rem;
		color: var(--color-muted);
	}

	.tick {
		position: absolute;
		top: 0;
		left: calc(var(--inset) + var(--at) * var(--year-w));
		transform: translateX(-50%);
	}

	.rows {
		position: relative;
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0.85rem 0 0;
		list-style: none;
	}

	.row {
		position: relative;
		height: var(--row-h);
	}

	.bar {
		position: absolute;
		inset-block: 0;
		left: calc(var(--inset) + var(--at) * var(--year-w));
		width: calc(var(--dur) * var(--year-w) - 5px);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0 1rem;
		box-sizing: border-box;
		overflow: hidden;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 9%, transparent);
	}

	.title {
		font-size: 0.95rem;
		color: var(--color-text);
		white-space: nowrap;
	}

	.years {
		font-size: 0.9rem;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.years {
		margin-left: auto;
		padding-left: 1rem;
	}

	.marker {
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--x);
		z-index: 2;
		width: 1px;
		background: color-mix(in srgb, var(--color-text) 32%, transparent);
		pointer-events: none;
	}

	@media (max-width: 800px) {
		.role-timeline {
			--year-w: 12.5rem;
		}
	}
</style>
