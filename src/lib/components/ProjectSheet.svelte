<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import { getWorkProject, type CaseFigureRatio } from '$lib/data';
	import CaseFigureMagnet from '$lib/components/CaseFigureMagnet.svelte';
	import SheetClose from '$lib/components/SheetClose.svelte';
	import CaseDiagram from '$lib/components/CaseDiagram.svelte';
	import MenuComponent from '$lib/components/MenuComponent.svelte';
	import RoleTimeline from '$lib/components/RoleTimeline.svelte';
	import CaseLogos from '$lib/components/CaseLogos.svelte';
	import CasePhones from '$lib/components/CasePhones.svelte';
	import {
		activeMotion,
		defaultCloseEaseId,
		defaultMotionPresetId,
		getMotionPreset,
		type MotionPreset
	} from '$lib/projectMotion';
	import {
		captureProjectOrigin,
		clearProject,
		hydrateProjectFromUrl,
		openProject,
		openProjectId,
		projectIdFromPage,
		projectIdFromUrl,
		projectOrigin,
		shouldHydrateProjectFromUrl,
		syncUrlAfterClose,
		waitForProjectSource,
		type ProjectOrigin
	} from '$lib/projectSheet';
	import { borrowVideo, returnVideo } from '$lib/videoHost';
	import { captureVideoFrame } from '$lib/videoPlayback';

	type Rect = {
		top: number;
		left: number;
		width: number;
		height: number;
		radius: string;
	};

	/** opening → open ⇄ dismissing → closing */
	type SheetPhase = 'opening' | 'open' | 'dismissing' | 'closing';

	/** Clicked case figure shown full-bleed inside the project window. */
	type FigureFill = {
		key: string;
		ratio: CaseFigureRatio;
		caption?: string;
		src?: string;
		background?: string;
		framed?: boolean;
		peek?: boolean;
		from: Rect;
	};

	let id = $state<string | null>(null);
	let origin = $state<ProjectOrigin | null>(null);
	let rendered = $state(false);
	let phase = $state<SheetPhase>('opening');
	let expanded = $state(false);
	let contentVisible = $state(false);
	let videoReady = $state(false);
	/** True while layout width/height is animating — video often paints black then. */
	let morphing = $state(false);
	let motion = $state<MotionPreset>(getMotionPreset(defaultMotionPresetId, defaultCloseEaseId));
	let sheetH = $state(0);

	let backdropEl: HTMLDivElement | undefined = $state();
	let cardEl: HTMLDivElement | undefined = $state();
	let scrollerEl: HTMLDivElement | undefined = $state();
	let ringEl: HTMLDivElement | undefined = $state();
	let heroEl: HTMLDivElement | undefined = $state();
	let videoMount: HTMLDivElement | undefined = $state();
	let videoEl: HTMLVideoElement | undefined = $state();
	let coverCanvas: HTMLCanvasElement | undefined = $state();

	let openRect: Rect | null = null;
	let openFrame = 0;
	let closeFrame = 0;
	let coverFrame = 0;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let contentTimer: ReturnType<typeof setTimeout> | undefined;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	/** Bumped on open / new close so a stale finishClose can't undo Forward. */
	let closeEpoch = 0;
	/** True when UI dismiss must `history.back()` after the morph (not browser Back). */
	let pendingHistoryPop = false;
	/** True once dismiss committed — blocks further overscroll / re-entrant close(). */
	let closeRequested = false;
	/** Escape/backdrop is scrolling to top before close — second trigger skips ahead. */
	let escapeScrollPending = false;
	let escapeScrollTimer: ReturnType<typeof setTimeout> | undefined;
	let escapeScrollCleanup: (() => void) | undefined;
	/** Eat residual trackpad inertia after unmount so the page doesn't keep scrolling. */
	let pageScrollLockTimer: ReturnType<typeof setTimeout> | undefined;
	let pageScrollLockCleanup: (() => void) | undefined;
	/** Element that opened the sheet — restore focus on close. */
	let restoreFocusEl: HTMLElement | null = null;
	/** “Click, scroll up, or press esc” — hides on first wheel / scroll. */
	let hintVisible = $state(false);
	let closeHot = $state(false);
	let hintReady = false;
	let hintTimer: ReturnType<typeof setTimeout> | undefined;
	/** Custom overlay scrollbar (macOS hides native ones). */
	let scrollThumb = $state({ top: 0, height: 0, visible: false });
	let thumbDragging = $state(false);
	/** Figure viewer overlay scrollbars (vertical + horizontal). */
	let figureScrollThumbY = $state({ top: 0, height: 0, visible: false });
	let figureScrollThumbX = $state({ left: 0, width: 0, visible: false });
	let figureThumbDragging = $state(false);

	/** Clicked case figure — fills the project window. */
	let figureFill = $state<FigureFill | null>(null);
	let figureFillEl: HTMLDivElement | undefined = $state();
	let figureScrollerEl: HTMLDivElement | undefined = $state();
	let figureScrollRailXEl: HTMLDivElement | undefined = $state();
	let figureFlyClipEl: HTMLDivElement | undefined = $state();
	let figureFlyEl: HTMLImageElement | undefined = $state();
	let figureStageEl: HTMLDivElement | undefined = $state();
	let figureFillMorphing = $state(false);
	/** Case thumb key hidden while the figure viewer (or FLIP) owns that image. */
	let figureOpenKey = $state<string | null>(null);
	let figureFillEpoch = 0;
	let figureFillTimer: ReturnType<typeof setTimeout> | undefined;
	let figureFlyAnims: Animation[] = [];
	let figureStageAnim: Animation | null = null;
	/** Eat residual trackpad inertia after figure-fill closes so the case doesn't scroll. */
	let sheetScrollLockUntil = 0;
	let sheetScrollLockY = 0;
	let sheetScrollLockTimer: ReturnType<typeof setTimeout> | undefined;

	/** Nested figure fills the project window edge-to-edge. */
	const FIGURE_FILL_INSET = 0;
	/** Default inset around the image at zoom 1 (and minimum canvas pad). */
	const FIGURE_VIEW_PAD = 20;
	/** Allow zooming out past “fit width” so the image can sit inside a larger canvas. */
	const FIGURE_ZOOM_MIN = 0.25;
	const FIGURE_ZOOM_MAX = 3;
	const FIGURE_ZOOM_STEP = 0.25;
	let figureZoom = $state(1);
	const canFigureZoomOut = $derived(figureZoom > FIGURE_ZOOM_MIN + 0.001);
	const canFigureZoomIn = $derived(figureZoom < FIGURE_ZOOM_MAX - 0.001);
	let figurePinchDist = 0;
	let figurePinchZoom0 = 1;
	/**
	 * Minimap: canvas = max zoom-out world; image fixed inside it; view moves/resizes.
	 * Image/view rects are % of that max-out world.
	 */
	let figureMinimap = $state({
		visible: false,
		aspect: 16 / 10,
		image: { left: 0, top: 0, width: 100, height: 100 },
		view: { left: 0, top: 0, width: 100, height: 100 }
	});
	let figureMinimapDragging = false;
	/** Grab-to-pan on the figure canvas (non-reactive — class toggled on the scroller). */
	let figurePanning = false;
	let figurePanPointerId: number | null = null;
	let figurePanLastX = 0;
	let figurePanLastY = 0;
	/** Case figures with `expand` that have finished their reveal. */
	let expandedFigures = $state<Record<string, boolean>>({});

	/** 0–1 ring fill (non-reactive — gesture paints without re-rendering). */
	let ringProgress = 0;
	let rawPull = 0;
	let touchActive = false;
	let touchLastY = 0;
	let pullSamples: { t: number; pull: number }[] = [];
	let gestureVelocity = 0;

	const project = $derived(getWorkProject(id));
	const sheetTitle = $derived(project?.title ?? '');
	const isDismissing = $derived(phase === 'dismissing');
	const isClosing = $derived(phase === 'closing');
	const figureFilled = $derived(Boolean(figureFill));
	const canDismiss = $derived((phase === 'open' || phase === 'dismissing') && !figureFilled);

	/**
	 * Dismiss is overscroll-at-top only (scrollTop === 0).
	 * Hero scrolls with the page content once you leave the top.
	 */
	const PULL_RANGE = 280;
	/** Max open→thumb morph while pulling to dismiss (ring at 100% ⇒ 10% along path). */
	const DISMISS_PREVIEW = 0.1;
	const FLICK_VELOCITY = 0.7;
	const DEAD_ZONE = 8;
	const VELOCITY_WINDOW_MS = 100;
	const COAST_MS = 180;
	const SCROLL_SETTLE_MS = 120;

	const reduceMotion =
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function cssLength(expr: string) {
		const probe = document.createElement('div');
		probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${expr}`;
		document.body.appendChild(probe);
		const width = probe.getBoundingClientRect().width;
		probe.remove();
		return width;
	}

	function radiusPx(value: string) {
		const first = value.trim().split(/\s+/)[0] || '1.75rem';
		if (first.endsWith('px')) return parseFloat(first) || 0;
		try {
			return cssLength(first);
		} catch {
			return cssLength('1.75rem');
		}
	}

	function withPxRadius(rect: Rect): Rect {
		return { ...rect, radius: `${radiusPx(rect.radius)}px` };
	}

	function finalRect(): Rect {
		// Sit a bit closer to page chrome than the old 40/20 inset — not full page-pad.
		const pagePad = cssLength('var(--page-pad)');
		const padY = Math.round(Math.min(48, Math.max(28, pagePad * 0.7)));
		const padX = Math.round(Math.min(28, Math.max(12, pagePad * 0.35)));
		return withPxRadius({
			top: padY,
			left: cssLength(`calc(var(--grid-offset) + var(--grid-pad) + ${padX}px)`),
			width: cssLength(`calc(var(--span-8) - ${padX * 2}px)`),
			height: window.innerHeight - padY * 2,
			radius: '1.75rem'
		});
	}

	function thumbRect(): Rect {
		// Prefer a live measurement so Back/Forward land on the real card.
		const live = id ? captureProjectOrigin(id) : null;
		const thumb = live ?? origin;
		if (thumb) {
			return withPxRadius({
				top: thumb.top,
				left: thumb.left,
				width: thumb.width,
				height: thumb.height,
				radius: thumb.radius
			});
		}
		const open = openRect ?? finalRect();
		return withPxRadius({
			top: open.top + 40,
			left: open.left + open.width * 0.05,
			width: open.width * 0.9,
			height: open.height * 0.9,
			radius: open.radius
		});
	}

	function clamp01(t: number) {
		return Math.min(1, Math.max(0, t));
	}

	function lerp(a: number, b: number, t: number) {
		return a + (b - a) * t;
	}

	function lerpRect(from: Rect, to: Rect, t: number): Rect {
		return withPxRadius({
			top: lerp(from.top, to.top, t),
			left: lerp(from.left, to.left, t),
			width: lerp(from.width, to.width, t),
			height: lerp(from.height, to.height, t),
			radius: `${lerp(radiusPx(from.radius), radiusPx(to.radius), t)}px`
		});
	}

	function currentCardRect(): Rect {
		if (!cardEl) return openRect ?? finalRect();
		const r = cardEl.getBoundingClientRect();
		return withPxRadius({
			top: r.top,
			left: r.left,
			width: r.width,
			height: r.height,
			radius: getComputedStyle(cardEl).borderRadius || '1.75rem'
		});
	}

	/** Scrub a few percent toward the thumbnail while the dismiss ring fills. */
	function paintDismissPreview(progress: number) {
		if (!cardEl || !expanded || phase === 'closing') return;
		const open = openRect ?? finalRect();
		const thumb = thumbRect();
		const t = clamp01(progress) * DISMISS_PREVIEW;
		const rect = lerpRect(open, thumb, t);
		applyChrome(cardEl, rect, false);
		sheetH = rect.height;
	}

	/** Two-state layout chrome — no scale(). Uses WAAPI so close-curve easing actually applies. */
	function applyChrome(
		el: HTMLElement,
		rect: Rect,
		animate: boolean,
		opts?: { duration?: number; ease?: string }
	) {
		const duration = opts?.duration ?? motion.openDuration;
		const ease = opts?.ease ?? motion.openEase;
		const r = withPxRadius(rect);
		const next = {
			top: `${r.top}px`,
			left: `${r.left}px`,
			width: `${r.width}px`,
			height: `${r.height}px`,
			borderRadius: r.radius
		};

		for (const anim of el.getAnimations()) anim.cancel();
		el.style.transition = 'none';
		el.style.transform = 'none';

		if (!animate || reduceMotion || duration <= 0) {
			el.style.willChange = 'auto';
			el.style.top = next.top;
			el.style.left = next.left;
			el.style.width = next.width;
			el.style.height = next.height;
			el.style.borderRadius = next.borderRadius;
			return;
		}

		const cs = getComputedStyle(el);
		const prev = {
			top: el.style.top || cs.top,
			left: el.style.left || cs.left,
			width: el.style.width || cs.width,
			height: el.style.height || cs.height,
			borderRadius: el.style.borderRadius || cs.borderRadius
		};

		el.style.willChange = 'top, left, width, height, border-radius';
		const anim = el.animate([prev, next], {
			duration,
			easing: ease,
			fill: 'forwards'
		});

		anim.finished
			.then(() => {
				if (anim.playState === 'idle') return;
				el.style.top = next.top;
				el.style.left = next.left;
				el.style.width = next.width;
				el.style.height = next.height;
				el.style.borderRadius = next.borderRadius;
				el.style.willChange = 'auto';
				anim.cancel();
			})
			.catch(() => {
				/* cancelled mid-flight */
			});
	}

	function rectRelativeToCard(el: Element): Rect {
		const card = cardEl?.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		const radius = getComputedStyle(el).borderRadius || '1rem';
		if (!card) {
			return withPxRadius({
				top: r.top,
				left: r.left,
				width: r.width,
				height: r.height,
				radius
			});
		}
		return withPxRadius({
			top: r.top - card.top,
			left: r.left - card.left,
			width: r.width,
			height: r.height,
			radius
		});
	}

	function figureFillTargetRect(): Rect {
		const inset = FIGURE_FILL_INSET;
		const cardRadius = radiusPx(
			cardEl ? getComputedStyle(cardEl).borderRadius || '1.75rem' : '1.75rem'
		);
		const w = cardEl?.clientWidth ?? 0;
		const h = cardEl?.clientHeight ?? 0;
		return withPxRadius({
			top: inset,
			left: inset,
			width: Math.max(0, w - inset * 2),
			height: Math.max(0, h - inset * 2),
			radius: `${Math.max(0, cardRadius - inset)}px`
		});
	}

	function settleFigureFillChrome() {
		if (!figureFillEl) return;
		const inset = FIGURE_FILL_INSET;
		const cardRadius = radiusPx(
			cardEl ? getComputedStyle(cardEl).borderRadius || '1.75rem' : '1.75rem'
		);
		figureFillEl.style.top = `${inset}px`;
		figureFillEl.style.left = `${inset}px`;
		figureFillEl.style.width = `calc(100% - ${inset * 2}px)`;
		figureFillEl.style.height = `calc(100% - ${inset * 2}px)`;
		figureFillEl.style.borderRadius = `${Math.max(0, cardRadius - inset)}px`;
		figureFillEl.style.willChange = 'auto';
	}

	function resetFigureView() {
		figureZoom = 1;
		figurePinchDist = 0;
		figurePinchZoom0 = 1;
		figureMinimapDragging = false;
		figureThumbDragging = false;
		endFigurePan();
		figureMinimap = {
			visible: false,
			aspect: 16 / 10,
			image: { left: 0, top: 0, width: 100, height: 100 },
			view: { left: 0, top: 0, width: 100, height: 100 }
		};
		figureScrollThumbY = { top: 0, height: 0, visible: false };
		figureScrollThumbX = { left: 0, width: 0, visible: false };
		if (figureFillEl) figureFillEl.style.setProperty('--figure-zoom', '1');
		if (figureScrollerEl) {
			figureScrollerEl.scrollTop = 0;
			figureScrollerEl.scrollLeft = 0;
		}
		const page = figureScrollerEl?.querySelector('.figure-page');
		if (page instanceof HTMLElement) page.style.padding = '0';
	}

	/** Center when the image fits; top-align (keep horizontal center) when it overflows. */
	function settleFigureInCanvas() {
		const scroller = figureScrollerEl;
		const img = figureImageEl();
		if (!scroller || !(img instanceof HTMLElement)) return;
		const maxL = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
		const maxT = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
		scroller.scrollLeft = maxL / 2;
		if (img.offsetHeight > scroller.clientHeight - FIGURE_VIEW_PAD * 2 + 0.5) {
			scroller.scrollTop = 0;
		} else {
			scroller.scrollTop = maxT / 2;
		}
	}

	function touchDistance(a: Touch, b: Touch) {
		return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
	}

	function figureImageEl() {
		return figureScrollerEl?.querySelector('.figure-image') ?? null;
	}

	/**
	 * Keep at least FIGURE_VIEW_PAD around the image; expand padding when zoomed out
	 * so the image can still be panned inside the canvas.
	 */
	function syncFigureCentering(opts?: { settle?: boolean }) {
		const scroller = figureScrollerEl;
		const page = scroller?.querySelector('.figure-page');
		const img = figureImageEl();
		if (!scroller || !(page instanceof HTMLElement) || !(img instanceof HTMLElement)) return;

		page.style.padding = '0';
		const padX = Math.max(
			FIGURE_VIEW_PAD,
			scroller.clientWidth - img.offsetWidth - FIGURE_VIEW_PAD
		);
		const padY = Math.max(
			FIGURE_VIEW_PAD,
			scroller.clientHeight - img.offsetHeight - FIGURE_VIEW_PAD
		);
		page.style.padding = `${padY}px ${padX}px`;
		if (opts?.settle) settleFigureInCanvas();
	}

	/**
	 * Zoom toward a screen point (cursor / pinch midpoint). Toolbar uses viewport center.
	 */
	function setFigureZoomLevel(next: number, clientX?: number, clientY?: number) {
		const scroller = figureScrollerEl;
		const page = scroller?.querySelector('.figure-page');
		const z0 = figureZoom;
		const z1 = Math.min(FIGURE_ZOOM_MAX, Math.max(FIGURE_ZOOM_MIN, next));
		if (Math.abs(z1 - z0) < 1e-6) return;

		const img = figureImageEl();
		let relX = 0.5;
		let relY = 0.5;
		let viewX = 0.5;
		let viewY = 0.5;

		if (scroller && img instanceof HTMLElement) {
			const scrollerRect = scroller.getBoundingClientRect();
			const anchorX = clientX ?? scrollerRect.left + scroller.clientWidth / 2;
			const anchorY = clientY ?? scrollerRect.top + scroller.clientHeight / 2;
			viewX = anchorX - scrollerRect.left;
			viewY = anchorY - scrollerRect.top;
			const imgRect = img.getBoundingClientRect();
			if (imgRect.width > 0 && imgRect.height > 0) {
				relX = (anchorX - imgRect.left) / imgRect.width;
				relY = (anchorY - imgRect.top) / imgRect.height;
			}
		}

		figureZoom = z1;
		if (figureFillEl) figureFillEl.style.setProperty('--figure-zoom', String(z1));
		if (scroller) void scroller.offsetHeight;
		syncFigureCentering();
		if (scroller) void scroller.offsetHeight;

		if (!scroller || !(img instanceof HTMLElement) || !(page instanceof HTMLElement)) return;

		const style = getComputedStyle(page);
		const padLeft = parseFloat(style.paddingLeft) || 0;
		const padTop = parseFloat(style.paddingTop) || 0;
		const maxL = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
		const maxT = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
		scroller.scrollLeft = Math.min(
			maxL,
			Math.max(0, padLeft + relX * img.offsetWidth - viewX)
		);
		scroller.scrollTop = Math.min(
			maxT,
			Math.max(0, padTop + relY * img.offsetHeight - viewY)
		);
		syncFigureMinimap();
	}

	function bumpFigureZoom(dir: 1 | -1) {
		const stepped =
			Math.round((figureZoom + dir * FIGURE_ZOOM_STEP) / FIGURE_ZOOM_STEP) * FIGURE_ZOOM_STEP;
		setFigureZoomLevel(stepped);
	}

	function onFigureImageLoad() {
		syncFigureCentering({ settle: true });
		if (!figureFillMorphing) syncFigureMinimap();
	}

	/**
	 * Fixed minimap space = layout at FIGURE_ZOOM_MIN (largest panable canvas).
	 * Current view is projected into that space so it can never exceed the canvas.
	 */
	function figureMinimapWorld() {
		const scroller = figureScrollerEl;
		const page = scroller?.querySelector('.figure-page');
		const img = figureImageEl();
		if (!scroller || !(page instanceof HTMLElement) || !(img instanceof HTMLElement)) return null;

		const viewW = scroller.clientWidth;
		const viewH = scroller.clientHeight;
		const imgW = img.offsetWidth;
		const imgH = img.offsetHeight;
		const z = Math.max(figureZoom, 0.001);
		if (viewW < 1 || viewH < 1 || imgW < 1 || imgH < 1) return null;

		const style = getComputedStyle(page);
		const padL = parseFloat(style.paddingLeft) || 0;
		const padT = parseFloat(style.paddingTop) || 0;

		const baseW = imgW / z;
		const baseH = imgH / z;
		const imgWMin = baseW * FIGURE_ZOOM_MIN;
		const imgHMin = baseH * FIGURE_ZOOM_MIN;
		const padXMin = Math.max(FIGURE_VIEW_PAD, viewW - imgWMin - FIGURE_VIEW_PAD);
		const padYMin = Math.max(FIGURE_VIEW_PAD, viewH - imgHMin - FIGURE_VIEW_PAD);
		const worldW = imgWMin + padXMin * 2;
		const worldH = imgHMin + padYMin * 2;

		const toWorld = (x: number, y: number) => ({
			x: padXMin + ((x - padL) / imgW) * imgWMin,
			y: padYMin + ((y - padT) / imgH) * imgHMin
		});

		const fromWorld = (x: number, y: number) => ({
			x: padL + ((x - padXMin) / imgWMin) * imgW,
			y: padT + ((y - padYMin) / imgHMin) * imgH
		});

		return {
			viewW,
			viewH,
			worldW,
			worldH,
			padXMin,
			padYMin,
			imgWMin,
			imgHMin,
			toWorld,
			fromWorld
		};
	}

	function syncFigureMinimap() {
		const scroller = figureScrollerEl;
		const world = figureMinimapWorld();
		if (!scroller || !world) {
			figureMinimap = {
				visible: false,
				aspect: 16 / 10,
				image: { left: 0, top: 0, width: 100, height: 100 },
				view: { left: 0, top: 0, width: 100, height: 100 }
			};
			updateFigureScrollThumbs();
			return;
		}

		const { worldW, worldH, padXMin, padYMin, imgWMin, imgHMin, viewW, viewH, toWorld } = world;
		const tl = toWorld(scroller.scrollLeft, scroller.scrollTop);
		const br = toWorld(scroller.scrollLeft + viewW, scroller.scrollTop + viewH);

		figureMinimap = {
			visible: true,
			aspect: worldW / worldH,
			image: {
				left: (padXMin / worldW) * 100,
				top: (padYMin / worldH) * 100,
				width: (imgWMin / worldW) * 100,
				height: (imgHMin / worldH) * 100
			},
			view: {
				left: (tl.x / worldW) * 100,
				top: (tl.y / worldH) * 100,
				width: Math.max(2, ((br.x - tl.x) / worldW) * 100),
				height: Math.max(2, ((br.y - tl.y) / worldH) * 100)
			}
		};
		updateFigureScrollThumbs();
	}

	/** Place the view-window center at a normalized point on the max-out canvas. */
	function scrollFigureToMinimapPoint(normX: number, normY: number) {
		const scroller = figureScrollerEl;
		const world = figureMinimapWorld();
		if (!scroller || !world) return;

		const x = Math.min(1, Math.max(0, normX));
		const y = Math.min(1, Math.max(0, normY));
		const content = world.fromWorld(x * world.worldW, y * world.worldH);
		const maxL = Math.max(0, scroller.scrollWidth - world.viewW);
		const maxT = Math.max(0, scroller.scrollHeight - world.viewH);
		scroller.scrollLeft = Math.min(maxL, Math.max(0, content.x - world.viewW / 2));
		scroller.scrollTop = Math.min(maxT, Math.max(0, content.y - world.viewH / 2));
		syncFigureMinimap();
	}

	function endFigurePan(scroller = figureScrollerEl) {
		figurePanning = false;
		figurePanPointerId = null;
		scroller?.classList.remove('is-panning');
	}

	function onFigurePanPointerDown(event: PointerEvent) {
		if (figureFillMorphing || figureMinimapDragging || figureThumbDragging || figurePinchDist > 0)
			return;
		if (event.button !== 0) return;
		const scroller = figureScrollerEl;
		if (!scroller) return;

		figurePanning = true;
		figurePanPointerId = event.pointerId;
		figurePanLastX = event.clientX;
		figurePanLastY = event.clientY;
		scroller.classList.add('is-panning');
		scroller.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function onFigurePanPointerMove(event: PointerEvent) {
		if (!figurePanning || event.pointerId !== figurePanPointerId) return;
		if (figurePinchDist > 0) {
			endFigurePan();
			return;
		}
		const scroller = figureScrollerEl;
		if (!scroller) return;

		const dx = event.clientX - figurePanLastX;
		const dy = event.clientY - figurePanLastY;
		figurePanLastX = event.clientX;
		figurePanLastY = event.clientY;
		scroller.scrollLeft -= dx;
		scroller.scrollTop -= dy;
	}

	function onFigurePanPointerUp(event: PointerEvent) {
		if (!figurePanning || event.pointerId !== figurePanPointerId) return;
		const scroller = figureScrollerEl;
		endFigurePan(scroller);
		try {
			scroller?.releasePointerCapture(event.pointerId);
		} catch {
			/* already released */
		}
	}

	function onFigureMinimapPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		const map = event.currentTarget;
		if (!(map instanceof HTMLElement)) return;
		endFigurePan();
		figureMinimapDragging = true;
		map.setPointerCapture(event.pointerId);
		const rect = map.getBoundingClientRect();
		scrollFigureToMinimapPoint(
			(event.clientX - rect.left) / rect.width,
			(event.clientY - rect.top) / rect.height
		);
	}

	function onFigureMinimapPointerMove(event: PointerEvent) {
		if (!figureMinimapDragging) return;
		const map = event.currentTarget;
		if (!(map instanceof HTMLElement)) return;
		const rect = map.getBoundingClientRect();
		scrollFigureToMinimapPoint(
			(event.clientX - rect.left) / rect.width,
			(event.clientY - rect.top) / rect.height
		);
	}

	function onFigureMinimapPointerUp(event: PointerEvent) {
		if (!figureMinimapDragging) return;
		figureMinimapDragging = false;
		try {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		} catch {
			/* already released */
		}
	}

	function figureScrollBy(delta: number) {
		if (!figureScrollerEl) return false;
		const max = Math.max(0, figureScrollerEl.scrollHeight - figureScrollerEl.clientHeight);
		const next = Math.min(max, Math.max(0, figureScrollerEl.scrollTop + delta));
		if (next === figureScrollerEl.scrollTop) return false;
		figureScrollerEl.scrollTop = next;
		return true;
	}

	function figureFillIsLight(background?: string) {
		if (!background) return false;
		const hex = background.trim().replace(/^#/, '');
		if (!/^[0-9a-fA-F]{6}$/.test(hex)) return false;
		const r = Number.parseInt(hex.slice(0, 2), 16);
		const g = Number.parseInt(hex.slice(2, 4), 16);
		const b = Number.parseInt(hex.slice(4, 6), 16);
		return (r * 299 + g * 587 + b * 114) / 1000 > 160;
	}

	function markFigureExpanded(key: string) {
		if (expandedFigures[key]) return;
		expandedFigures[key] = true;
	}

	/** Cropped figures grow to full once they settle in view. */
	function figureExpandOnView(node: HTMLElement, key: string) {
		if (!key) return;
		if (reduceMotion) {
			markFigureExpanded(key);
			return;
		}

		let io: IntersectionObserver | undefined;
		const arm = () => {
			io?.disconnect();
			io = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
							markFigureExpanded(key);
							io?.disconnect();
							break;
						}
					}
				},
				{
					root: scrollerEl ?? null,
					rootMargin: '0px 0px -10% 0px',
					threshold: [0.45, 0.6]
				}
			);
			io.observe(node);
		};

		// Scroller binds after open — retry once on the next frame if needed.
		arm();
		const retry = requestAnimationFrame(arm);

		return {
			destroy() {
				cancelAnimationFrame(retry);
				io?.disconnect();
			}
		};
	}

	function openFigureFill(
		event: MouseEvent,
		payload: {
			key: string;
			ratio: CaseFigureRatio;
			caption?: string;
			src?: string;
			background?: string;
			framed?: boolean;
			peek?: boolean;
		}
	) {
		if (phase !== 'open' || !contentVisible || morphing || closeRequested || figureFill) return;
		const trigger = event.currentTarget;
		if (!(trigger instanceof Element) || !cardEl) return;

		const from = rectRelativeToCard(trigger);
		const epoch = ++figureFillEpoch;
		cancelFigureFly();
		figureFillMorphing = true;
		resetFigureView();
		rawPull = 0;
		clearPullSamples();
		paintRing(0);
		figureFill = { ...payload, from };
		setCaseFigureThumbHidden(payload.key);
		hideCloseHint();

		void tick().then(async () => {
			if (epoch !== figureFillEpoch || !figureFillEl) return;
			// Full-size shell for the open lifetime; FLIP owns the perceived motion.
			settleFigureFillChrome();
			if (figureStageEl) figureStageEl.style.opacity = '0';

			await waitForFigureImage();
			if (epoch !== figureFillEpoch || !figureFillEl) return;

			resetFigureView();
			syncFigureCentering({ settle: true });
			void figureScrollerEl?.offsetHeight;
			await tick();
			if (epoch !== figureFillEpoch || !figureFillEl) return;

			const settled = figureSettledImageRect();
			const clipFrom = figureThumbClipRect(payload.key);
			const bitmapFrom = figureThumbBitmapRect(payload.key);

			if (reduceMotion || !payload.src || !figureFlyClipEl || !figureFlyEl) {
				void fadeFigureStage(1, 0, motion.openEase);
				figureFillMorphing = false;
				syncFigureMinimap();
				return;
			}

			void fadeFigureStage(1, motion.openDuration, motion.openEase);
			await animateFigureShared(clipFrom, bitmapFrom, settled, settled, {
				duration: motion.openDuration,
				ease: motion.openEase
			});
			if (epoch !== figureFillEpoch) return;

			// Commit stage opacity in case the fade was still running / interrupted.
			if (figureStageEl) figureStageEl.style.opacity = '1';
			syncFigureCentering({ settle: true });
			syncFigureMinimap();
			figureFillMorphing = false;
			hideFigureFly();
		});
	}

	/**
	 * After figure-fill closes, trackpad inertia still emits wheel events that
	 * would scroll the case study. Pin scrollTop and eat input briefly.
	 */
	function lockSheetScrollBriefly(ms = 480) {
		if (!scrollerEl) return;
		sheetScrollLockY = scrollerEl.scrollTop;
		sheetScrollLockUntil = performance.now() + ms;
		clearTimeout(sheetScrollLockTimer);
		sheetScrollLockTimer = setTimeout(() => {
			sheetScrollLockUntil = 0;
		}, ms);
	}

	function sheetScrollLocked() {
		return performance.now() < sheetScrollLockUntil;
	}

	function pinSheetScrollLock() {
		if (!scrollerEl || !sheetScrollLocked()) return;
		if (scrollerEl.scrollTop !== sheetScrollLockY) {
			scrollerEl.scrollTop = sheetScrollLockY;
		}
	}

	function rectRelativeTo(el: Element, container: Element): Rect {
		const c = container.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		const radius = getComputedStyle(el).borderRadius || '0px';
		return withPxRadius({
			top: r.top - c.top,
			left: r.left - c.left,
			width: r.width,
			height: r.height,
			radius
		});
	}

	/** Visible thumb window (button) in figure-fill coordinates. */
	function figureThumbClipRect(key: string): Rect {
		const fallback = figureFill?.from ?? figureFillTargetRect();
		const btn = scrollerEl?.querySelector(`[data-figure-key="${key}"]`);
		if (!(btn instanceof Element) || !figureFillEl) return fallback;
		return rectRelativeTo(btn, figureFillEl);
	}

	/**
	 * Thumb bitmap rect in figure-fill coordinates.
	 * Peek thumbs use an oversized top-left image clipped by the button.
	 */
	function figureThumbBitmapRect(key: string): Rect {
		const clip = figureThumbClipRect(key);
		const btn = scrollerEl?.querySelector(`[data-figure-key="${key}"]`);
		if (!(btn instanceof Element) || !figureFillEl) return clip;
		const img = btn.querySelector('img');
		if (!(img instanceof Element)) return clip;
		return rectRelativeTo(img, figureFillEl);
	}

	/** Settled viewer image rect in figure-fill coordinates. */
	function figureSettledImageRect(): Rect {
		const img = figureImageEl();
		if (!(img instanceof Element) || !figureFillEl) {
			return withPxRadius({
				top: FIGURE_VIEW_PAD,
				left: FIGURE_VIEW_PAD,
				width: Math.max(0, (figureFillEl?.clientWidth ?? 0) - FIGURE_VIEW_PAD * 2),
				height: Math.max(0, (figureFillEl?.clientHeight ?? 0) - FIGURE_VIEW_PAD * 2),
				radius: '8px'
			});
		}
		const rect = rectRelativeTo(img, figureFillEl);
		return { ...rect, radius: '8px' };
	}

	function setCaseFigureThumbHidden(key: string | null) {
		figureOpenKey = key;
	}

	function cancelFigureFly() {
		for (const anim of figureFlyAnims) anim.cancel();
		figureFlyAnims = [];
	}

	function cancelFigureStage() {
		figureStageAnim?.cancel();
		figureStageAnim = null;
	}

	function rectKeyframes(from: Rect, to: Rect) {
		return [
			{
				top: `${from.top}px`,
				left: `${from.left}px`,
				width: `${from.width}px`,
				height: `${from.height}px`,
				borderRadius: from.radius
			},
			{
				top: `${to.top}px`,
				left: `${to.left}px`,
				width: `${to.width}px`,
				height: `${to.height}px`,
				borderRadius: to.radius
			}
		];
	}

	function applyRect(el: HTMLElement, rect: Rect) {
		el.style.top = `${rect.top}px`;
		el.style.left = `${rect.left}px`;
		el.style.width = `${rect.width}px`;
		el.style.height = `${rect.height}px`;
		el.style.borderRadius = rect.radius;
	}

	function fadeFigureStage(to: number, duration: number, ease: string) {
		const stage = figureStageEl;
		if (!stage) return Promise.resolve();
		cancelFigureStage();
		const from = Number.parseFloat(getComputedStyle(stage).opacity) || 0;
		if (reduceMotion || duration <= 0) {
			stage.style.opacity = String(to);
			return Promise.resolve();
		}
		const anim = stage.animate([{ opacity: from }, { opacity: to }], {
			duration,
			easing: ease,
			fill: 'forwards'
		});
		figureStageAnim = anim;
		return anim.finished
			.then(() => {
				stage.style.opacity = String(to);
				if (figureStageAnim === anim) {
					anim.cancel();
					figureStageAnim = null;
				}
			})
			.catch(() => {
				stage.style.opacity = String(to);
			});
	}

	/**
	 * Shared-element zoom: clip window + bitmap move together.
	 * Peek thumbs keep the oversized top-left crop, so close zooms into that crop
	 * instead of squash-stretching the full page into the thumb frame.
	 */
	function animateFigureShared(
		clipFrom: Rect,
		bitmapFrom: Rect,
		clipTo: Rect,
		bitmapTo: Rect,
		opts: { duration: number; ease: string }
	): Promise<void> {
		const clip = figureFlyClipEl;
		const img = figureFlyEl;
		if (!clip || !img) return Promise.resolve();

		cancelFigureFly();

		const imgFromLocal: Rect = {
			top: bitmapFrom.top - clipFrom.top,
			left: bitmapFrom.left - clipFrom.left,
			width: bitmapFrom.width,
			height: bitmapFrom.height,
			radius: '0px'
		};
		const imgToLocal: Rect = {
			top: bitmapTo.top - clipTo.top,
			left: bitmapTo.left - clipTo.left,
			width: bitmapTo.width,
			height: bitmapTo.height,
			radius: '0px'
		};

		clip.style.visibility = 'visible';
		applyRect(clip, clipFrom);
		applyRect(img, imgFromLocal);

		if (reduceMotion || opts.duration <= 0) {
			applyRect(clip, clipTo);
			applyRect(img, imgToLocal);
			return Promise.resolve();
		}

		const timing: KeyframeAnimationOptions = {
			duration: opts.duration,
			easing: opts.ease,
			fill: 'forwards'
		};
		const clipAnim = clip.animate(rectKeyframes(clipFrom, clipTo), timing);
		const imgAnim = img.animate(rectKeyframes(imgFromLocal, imgToLocal), timing);
		figureFlyAnims = [clipAnim, imgAnim];

		return Promise.all([clipAnim.finished, imgAnim.finished])
			.then(() => {
				applyRect(clip, clipTo);
				applyRect(img, imgToLocal);
				for (const anim of figureFlyAnims) anim.cancel();
				figureFlyAnims = [];
			})
			.catch(() => {
				/* cancelled mid-flight */
			});
	}

	function hideFigureFly() {
		if (figureFlyClipEl) figureFlyClipEl.style.visibility = 'hidden';
	}

	function waitForFigureImage(): Promise<void> {
		const img = figureImageEl();
		if (!(img instanceof HTMLImageElement)) return Promise.resolve();
		if (img.complete && img.naturalWidth > 0) return Promise.resolve();
		return new Promise((resolve) => {
			const done = () => {
				img.removeEventListener('load', done);
				img.removeEventListener('error', done);
				resolve();
			};
			img.addEventListener('load', done);
			img.addEventListener('error', done);
		});
	}

	function finishFigureFillClose(epoch: number) {
		if (epoch !== figureFillEpoch) return;
		cancelFigureFly();
		cancelFigureStage();
		figureFill = null;
		figureFillMorphing = false;
		setCaseFigureThumbHidden(null);
		resetFigureView();
		rawPull = 0;
		paintRing(0);
		lockSheetScrollBriefly(480);
		pinSheetScrollLock();
		focusScroller();
	}

	function closeFigureFill(opts?: { immediate?: boolean }) {
		if (!figureFill) return;
		const current = figureFill;
		const epoch = ++figureFillEpoch;
		clearTimeout(figureFillTimer);
		clearTimeout(settleTimer);
		cancelFigureFly();
		rawPull = 0;
		clearPullSamples();
		paintRing(0);
		figureFillMorphing = true;
		// Cover the close morph + leftover trackpad inertia.
		lockSheetScrollBriefly(motion.closeDuration + 480);

		if (opts?.immediate || reduceMotion || !figureFillEl || !cardEl) {
			fadeFigureStage(0, 0, motion.closeEase);
			finishFigureFillClose(epoch);
			return;
		}

		void (async () => {
			// Return to default fit before FLIP (no morph from mid-zoom crop).
			if (Math.abs(figureZoom - 1) > 0.001) {
				setFigureZoomLevel(1);
			}
			syncFigureCentering({ settle: true });
			await tick();
			if (epoch !== figureFillEpoch || !figureFillEl) return;

			const settled = figureSettledImageRect();
			const clipTo = figureThumbClipRect(current.key);
			const bitmapTo = figureThumbBitmapRect(current.key);
			void fadeFigureStage(0, motion.closeDuration, motion.closeEase);

			await tick();
			if (epoch !== figureFillEpoch || !figureFlyClipEl || !figureFlyEl) {
				finishFigureFillClose(epoch);
				return;
			}

			// Zoom into the thumb crop (peek = oversized top-left) while the clip shrinks.
			await animateFigureShared(settled, settled, clipTo, bitmapTo, {
				duration: motion.closeDuration,
				ease: motion.closeEase
			});
			if (epoch !== figureFillEpoch) return;
			finishFigureFillClose(epoch);
		})();
	}

	function paintRing(progress: number) {
		ringProgress = clamp01(progress);
		// Don't dim the page backdrop while closing a figure fill.
		const dismissDim = figureFilled ? 0 : ringProgress * 0.35;
		backdropEl?.style.setProperty('--dismiss-progress', String(dismissDim));
		backdropEl?.style.setProperty('--ring-progress', String(ringProgress));
		cardEl?.style.setProperty('--ring-progress', String(ringProgress));

		const sheetActive = ringProgress > 0.001 && canDismiss;
		ringEl?.classList.toggle('active', sheetActive);
	}

	function atScrollTop() {
		return !scrollerEl || scrollerEl.scrollTop <= 0.5;
	}

	/**
	 * Kill rubber-band only at the top (hero must never expose a gap above it).
	 * Keep `contain` farther down so the bottom can still bounce.
	 */
	function syncTopOverscrollLock() {
		if (!scrollerEl) return;
		const nearTop = scrollerEl.scrollTop <= 64 || rawPull > 0 || phase === 'dismissing';
		scrollerEl.style.overscrollBehaviorY = nearTop ? 'none' : 'contain';
	}

	function clearPullSamples() {
		pullSamples = [];
		gestureVelocity = 0;
	}

	function notePullSample(value: number) {
		const t = performance.now();
		pullSamples.push({ t, pull: value });
		pullSamples = pullSamples.filter((sample) => t - sample.t <= VELOCITY_WINDOW_MS);
		if (pullSamples.length >= 2) {
			const first = pullSamples[0];
			const last = pullSamples[pullSamples.length - 1];
			const dt = last.t - first.t;
			if (dt > 0) gestureVelocity = (last.pull - first.pull) / dt;
		}
	}

	function scheduleSettle() {
		if (touchActive) return;
		clearTimeout(settleTimer);
		settleTimer = setTimeout(() => settleDismiss(), SCROLL_SETTLE_MS);
	}

	/** Adopt the card's live <video> — one decoder, no seek/reset. */
	function attachHeroVideo() {
		if (!videoMount || !origin?.video) return;
		videoEl = borrowVideo(origin.video, videoMount);
		videoReady = true;
		void videoEl.play().catch(() => {});
	}

	/**
	 * Layout width/height transitions blank <video> in Chromium/WebKit.
	 * Paint the live decoder onto a canvas cover for the duration of the morph only.
	 */
	function startCoverPaint() {
		stopCoverPaint();
		const tick = () => {
			if (!morphing) {
				stopCoverPaint();
				return;
			}
			const canvas = coverCanvas;
			const video = videoEl;
			if (canvas && video && video.readyState >= 2 && video.videoWidth > 0) {
				if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
				}
				const ctx = canvas.getContext('2d', { alpha: false });
				if (ctx) {
					try {
						ctx.drawImage(video, 0, 0);
					} catch {
						/* ignore */
					}
				}
			}
			coverFrame = requestAnimationFrame(tick);
		};
		coverFrame = requestAnimationFrame(tick);
	}

	function stopCoverPaint() {
		cancelAnimationFrame(coverFrame);
		coverFrame = 0;
	}

	/** Poster underlay for the morph (video may blank while width/height animate). */
	function prepareHero() {
		if (!heroEl) return;
		if (origin?.poster) heroEl.style.backgroundImage = `url(${origin.poster})`;
		const frame = captureVideoFrame(videoEl);
		if (frame) heroEl.style.backgroundImage = `url(${frame})`;
	}

	function clearDismiss() {
		rawPull = 0;
		clearPullSamples();
		paintRing(0);
		if (phase === 'dismissing') phase = 'open';
		// Bring the close hint back when pull-to-dismiss is cancelled.
		scheduleCloseHint();
		if (cardEl && expanded) {
			const open = openRect ?? finalRect();
			applyChrome(cardEl, open, !reduceMotion, {
				duration: Math.min(220, motion.closeDuration),
				ease: motion.closeEase
			});
			sheetH = open.height;
		}
		syncTopOverscrollLock();
	}

	function paintDismiss(nextRaw: number) {
		if (!canDismiss || reduceMotion || closeRequested || phase === 'closing') return;
		// Cap at 100% — extra overscroll must not keep accumulating past full.
		rawPull = Math.min(PULL_RANGE, Math.max(0, nextRaw));
		notePullSample(rawPull);
		const progress = clamp01(rawPull / PULL_RANGE);
		if (rawPull > DEAD_ZONE && phase === 'open') phase = 'dismissing';
		paintRing(progress);
		paintDismissPreview(progress);
		syncTopOverscrollLock();

		if (rawPull >= PULL_RANGE) {
			// Via close() so scroll-to-dismiss also pops `?project=` history.
			close();
		}
	}

	function settleDismiss(velocity = gestureVelocity) {
		if (!canDismiss || closeRequested || phase === 'closing') return;
		const projected = ringProgress + (velocity * COAST_MS) / PULL_RANGE;
		const shouldSnap =
			ringProgress >= 1 || projected >= 1 || (ringProgress > 0.35 && velocity >= FLICK_VELOCITY);

		clearPullSamples();
		if (shouldSnap) {
			close();
			return;
		}
		clearDismiss();
	}

	function closeHintIdle() {
		return (
			contentVisible &&
			!closeRequested &&
			!closeHot &&
			phase === 'open' &&
			rawPull <= DEAD_ZONE &&
			(!scrollerEl || scrollerEl.scrollTop <= 0.5)
		);
	}

	function hideCloseHint() {
		hintVisible = false;
		hintReady = false;
		clearHintTimer();
	}

	function clearHintTimer() {
		clearTimeout(hintTimer);
		hintTimer = undefined;
	}

	function scheduleCloseHint() {
		clearHintTimer();
		hintVisible = false;
		hintReady = false;
		if (!closeHintIdle()) return;
		hintTimer = setTimeout(() => {
			hintTimer = undefined;
			if (!closeHintIdle()) return;
			hintReady = true;
			hintVisible = true;
		}, 2000);
	}

	$effect(() => {
		if (closeHot) hideCloseHint();
		else scheduleCloseHint();
	});

	const SCROLL_TRACK_PAD = 28;
	const SCROLL_THUMB_MIN = 36;
	/** Clear close / zoom chrome on the vertical rail; horizontal sits on the bottom edge. */
	const FIGURE_SCROLL_TRACK_PAD_Y = 52;
	/** Fallback when the X rail isn't measured yet (matches CSS chrome clearances). */
	const FIGURE_SCROLL_RAIL_X_LEFT = 112;
	const FIGURE_SCROLL_RAIL_X_RIGHT = 112;

	function figureScrollTrackWidth() {
		const measured = figureScrollRailXEl?.clientWidth ?? 0;
		if (measured > 0) return measured;
		const scroller = figureScrollerEl;
		if (!scroller) return 0;
		return Math.max(
			0,
			scroller.clientWidth - FIGURE_SCROLL_RAIL_X_LEFT - FIGURE_SCROLL_RAIL_X_RIGHT
		);
	}

	function updateScrollThumb() {
		if (!scrollerEl) {
			scrollThumb = { top: 0, height: 0, visible: false };
			return;
		}
		const { scrollTop, scrollHeight, clientHeight } = scrollerEl;
		const overflow = scrollHeight - clientHeight;
		if (overflow <= 1 || clientHeight <= 0) {
			scrollThumb = { top: 0, height: 0, visible: false };
			return;
		}
		const trackH = Math.max(0, clientHeight - SCROLL_TRACK_PAD * 2);
		const height = Math.min(trackH, Math.max(SCROLL_THUMB_MIN, trackH * (clientHeight / scrollHeight)));
		// Rail is already inset; thumb top is relative to the rail.
		const top = (trackH - height) * (scrollTop / overflow);
		scrollThumb = { top, height, visible: true };
	}

	function updateFigureScrollThumbs() {
		const scroller = figureScrollerEl;
		if (!scroller) {
			figureScrollThumbY = { top: 0, height: 0, visible: false };
			figureScrollThumbX = { left: 0, width: 0, visible: false };
			return;
		}

		const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
			scroller;
		const overflowY = scrollHeight - clientHeight;
		const overflowX = scrollWidth - clientWidth;

		if (overflowY <= 1 || clientHeight <= 0) {
			figureScrollThumbY = { top: 0, height: 0, visible: false };
		} else {
			const trackH = Math.max(0, clientHeight - FIGURE_SCROLL_TRACK_PAD_Y * 2);
			const height = Math.min(
				trackH,
				Math.max(SCROLL_THUMB_MIN, trackH * (clientHeight / scrollHeight))
			);
			figureScrollThumbY = {
				top: (trackH - height) * (scrollTop / overflowY),
				height,
				visible: true
			};
		}

		if (overflowX <= 1 || clientWidth <= 0) {
			figureScrollThumbX = { left: 0, width: 0, visible: false };
		} else {
			const trackW = figureScrollTrackWidth();
			const width = Math.min(
				trackW,
				Math.max(SCROLL_THUMB_MIN, trackW * (clientWidth / scrollWidth))
			);
			figureScrollThumbX = {
				left: (trackW - width) * (scrollLeft / overflowX),
				width,
				visible: true
			};
		}
	}

	function onThumbPointerDown(event: PointerEvent) {
		if (!scrollerEl || !scrollThumb.visible) return;
		event.preventDefault();
		event.stopPropagation();

		const thumb = event.currentTarget as HTMLElement;
		const startY = event.clientY;
		const startScroll = scrollerEl.scrollTop;
		const overflow = scrollerEl.scrollHeight - scrollerEl.clientHeight;
		const trackH = Math.max(0, scrollerEl.clientHeight - SCROLL_TRACK_PAD * 2);
		const travel = Math.max(1, trackH - scrollThumb.height);

		thumbDragging = true;
		thumb.setPointerCapture(event.pointerId);

		const onMove = (moveEvent: PointerEvent) => {
			if (!scrollerEl) return;
			const delta = ((moveEvent.clientY - startY) / travel) * overflow;
			scrollerEl.scrollTop = Math.min(overflow, Math.max(0, startScroll + delta));
			updateScrollThumb();
		};

		const onUp = () => {
			thumbDragging = false;
			thumb.releasePointerCapture(event.pointerId);
			thumb.removeEventListener('pointermove', onMove);
			thumb.removeEventListener('pointerup', onUp);
			thumb.removeEventListener('pointercancel', onUp);
		};

		thumb.addEventListener('pointermove', onMove);
		thumb.addEventListener('pointerup', onUp);
		thumb.addEventListener('pointercancel', onUp);
	}

	function onFigureThumbYPointerDown(event: PointerEvent) {
		const scroller = figureScrollerEl;
		if (!scroller || !figureScrollThumbY.visible) return;
		event.preventDefault();
		event.stopPropagation();
		endFigurePan();

		const thumb = event.currentTarget as HTMLElement;
		const startY = event.clientY;
		const startScroll = scroller.scrollTop;
		const overflow = scroller.scrollHeight - scroller.clientHeight;
		const trackH = Math.max(0, scroller.clientHeight - FIGURE_SCROLL_TRACK_PAD_Y * 2);
		const travel = Math.max(1, trackH - figureScrollThumbY.height);

		figureThumbDragging = true;
		thumb.setPointerCapture(event.pointerId);

		const onMove = (moveEvent: PointerEvent) => {
			if (!figureScrollerEl) return;
			const delta = ((moveEvent.clientY - startY) / travel) * overflow;
			figureScrollerEl.scrollTop = Math.min(overflow, Math.max(0, startScroll + delta));
			syncFigureMinimap();
		};

		const onUp = () => {
			figureThumbDragging = false;
			thumb.releasePointerCapture(event.pointerId);
			thumb.removeEventListener('pointermove', onMove);
			thumb.removeEventListener('pointerup', onUp);
			thumb.removeEventListener('pointercancel', onUp);
		};

		thumb.addEventListener('pointermove', onMove);
		thumb.addEventListener('pointerup', onUp);
		thumb.addEventListener('pointercancel', onUp);
	}

	function onFigureThumbXPointerDown(event: PointerEvent) {
		const scroller = figureScrollerEl;
		if (!scroller || !figureScrollThumbX.visible) return;
		event.preventDefault();
		event.stopPropagation();
		endFigurePan();

		const thumb = event.currentTarget as HTMLElement;
		const startX = event.clientX;
		const startScroll = scroller.scrollLeft;
		const overflow = scroller.scrollWidth - scroller.clientWidth;
		const trackW = figureScrollTrackWidth();
		const travel = Math.max(1, trackW - figureScrollThumbX.width);

		figureThumbDragging = true;
		thumb.setPointerCapture(event.pointerId);

		const onMove = (moveEvent: PointerEvent) => {
			if (!figureScrollerEl) return;
			const delta = ((moveEvent.clientX - startX) / travel) * overflow;
			figureScrollerEl.scrollLeft = Math.min(overflow, Math.max(0, startScroll + delta));
			syncFigureMinimap();
		};

		const onUp = () => {
			figureThumbDragging = false;
			thumb.releasePointerCapture(event.pointerId);
			thumb.removeEventListener('pointermove', onMove);
			thumb.removeEventListener('pointerup', onUp);
			thumb.removeEventListener('pointercancel', onUp);
		};

		thumb.addEventListener('pointermove', onMove);
		thumb.addEventListener('pointerup', onUp);
		thumb.addEventListener('pointercancel', onUp);
	}

	function wheelDeltaY(event: WheelEvent) {
		if (event.deltaMode === 1) return event.deltaY * 16;
		if (event.deltaMode === 2) return event.deltaY * (scrollerEl?.clientHeight ?? 800);
		return event.deltaY;
	}

	/** Trackpad / wheel: dismiss from anywhere; content scroll works over the backdrop too. */
	function onWheel(event: WheelEvent) {
		if (!scrollerEl) return;

		// Close committed — eat residual trackpad/wheel so the hero can't drift mid-morph.
		if (closeRequested || phase === 'closing' || morphing) {
			event.preventDefault();
			if (scrollerEl.scrollTop !== 0) scrollerEl.scrollTop = 0;
			return;
		}

		// Image viewer — scroll the figure; ctrl/meta+wheel zooms.
		if (figureFill) {
			if (figureFillMorphing) {
				event.preventDefault();
				return;
			}
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
				const deltaY = wheelDeltaY(event);
				if (deltaY === 0) return;
				// Continuous zoom toward the cursor (trackpad pinch / ctrl+wheel).
				const factor = Math.exp(-deltaY * 0.01);
				setFigureZoomLevel(figureZoom * factor, event.clientX, event.clientY);
				return;
			}
			const deltaY = wheelDeltaY(event);
			if (deltaY === 0) return;
			if (figureScrollerEl && !figureScrollerEl.contains(event.target as Node)) {
				event.preventDefault();
				figureScrollBy(deltaY);
			}
			return;
		}

		// Just closed a figure — swallow inertia so the case doesn't keep scrolling.
		if (sheetScrollLocked()) {
			event.preventDefault();
			pinSheetScrollLock();
			return;
		}

		if (!canDismiss) return;

		const deltaY = wheelDeltaY(event);
		const scrollTop = scrollerEl.scrollTop;

		// At top (or this tick would cross it) while scrolling up — never rubber-band
		// above the hero; fold the overshoot into pull-to-dismiss instead.
		if (deltaY < 0 && scrollTop + deltaY <= 0.5) {
			event.preventDefault();
			if (scrollTop > 0) {
				scrollerEl.scrollTop = 0;
				updateScrollThumb();
			}
			syncTopOverscrollLock();
			if (reduceMotion) return;

			hideCloseHint();
			// Already at top → full delta is pull. Crossing zero → only the past-zero part.
			const pullDelta = scrollTop <= 0.5 ? -deltaY : Math.max(0, -(scrollTop + deltaY));
			if (rawPull >= PULL_RANGE) {
				close();
				return;
			}
			if (pullDelta > 0) {
				paintDismiss(rawPull + pullDelta);
				scheduleSettle();
			}
			return;
		}

		// While armed, scroll-down releases the ring before content moves.
		if (!reduceMotion && rawPull > 0 && deltaY > 0) {
			event.preventDefault();
			const next = rawPull - deltaY;
			if (next <= DEAD_ZONE) clearDismiss();
			else paintDismiss(next);
			scheduleSettle();
			return;
		}

		// Cursor over the sheet → native scrolling. Outside → drive the scroller.
		if (scrollerEl.contains(event.target as Node)) {
			syncTopOverscrollLock();
			return;
		}

		event.preventDefault();
		const maxScroll = Math.max(0, scrollerEl.scrollHeight - scrollerEl.clientHeight);
		scrollerEl.scrollTop = Math.min(maxScroll, Math.max(0, scrollerEl.scrollTop + deltaY));
		syncTopOverscrollLock();
		updateScrollThumb();
	}

	function onTouchStart(event: TouchEvent) {
		if (closeRequested) return;
		if (!canDismiss && !figureFilled) return;
		touchActive = true;
		touchLastY = event.touches[0]?.clientY ?? 0;
		clearTimeout(settleTimer);
		if (figureFill && event.touches.length >= 2) {
			endFigurePan();
			figurePinchDist = touchDistance(event.touches[0], event.touches[1]);
			figurePinchZoom0 = figureZoom;
		} else {
			figurePinchDist = 0;
		}
		if (videoEl) void videoEl.play().catch(() => {});
	}

	function onTouchMove(event: TouchEvent) {
		if (!touchActive || reduceMotion) return;
		if (closeRequested || phase === 'closing') {
			if (event.cancelable) event.preventDefault();
			if (scrollerEl && scrollerEl.scrollTop !== 0) scrollerEl.scrollTop = 0;
			return;
		}

		// Image viewer — pinch zooms toward the midpoint; one finger scrolls natively.
		if (figureFill) {
			if (figureFillMorphing) {
				if (event.cancelable) event.preventDefault();
				return;
			}
			if (event.touches.length >= 2) {
				if (event.cancelable) event.preventDefault();
				const a = event.touches[0];
				const b = event.touches[1];
				if (figurePinchDist <= 0) {
					figurePinchDist = touchDistance(a, b);
					figurePinchZoom0 = figureZoom;
				}
				if (figurePinchDist > 0) {
					setFigureZoomLevel(
						figurePinchZoom0 * (touchDistance(a, b) / figurePinchDist),
						(a.clientX + b.clientX) / 2,
						(a.clientY + b.clientY) / 2
					);
				}
			}
			return;
		}

		if (sheetScrollLocked()) {
			if (event.cancelable) event.preventDefault();
			pinSheetScrollLock();
			return;
		}

		if (!canDismiss) return;
		const y = event.touches[0]?.clientY ?? touchLastY;
		const dy = y - touchLastY; // >0 finger down → pull to dismiss at top
		touchLastY = y;

		if (atScrollTop() && dy > 0) {
			hideCloseHint();
			if (event.cancelable) event.preventDefault();
			syncTopOverscrollLock();
			if (rawPull >= PULL_RANGE) {
				close();
				return;
			}
			paintDismiss(rawPull + dy);
			return;
		}

		// Crossing the top on touch — clamp before rubber-band can show a gap.
		if (
			scrollerEl &&
			dy > 0 &&
			scrollerEl.scrollTop > 0 &&
			scrollerEl.scrollTop < dy + 1
		) {
			if (event.cancelable) event.preventDefault();
			const overshoot = dy - scrollerEl.scrollTop;
			scrollerEl.scrollTop = 0;
			syncTopOverscrollLock();
			updateScrollThumb();
			if (overshoot > 0) {
				hideCloseHint();
				paintDismiss(rawPull + overshoot);
			}
			return;
		}

		if (rawPull > 0) {
			if (event.cancelable) event.preventDefault();
			if (dy < 0) {
				const next = rawPull + dy;
				if (next <= DEAD_ZONE) clearDismiss();
				else paintDismiss(next);
			}
		}
	}

	function onTouchEnd(event: TouchEvent) {
		if (figureFill && event.touches.length >= 2) {
			figurePinchDist = touchDistance(event.touches[0], event.touches[1]);
			figurePinchZoom0 = figureZoom;
			return;
		}
		if (figureFill && event.touches.length === 1) {
			figurePinchDist = 0;
			touchLastY = event.touches[0].clientY;
			return;
		}
		if (!touchActive) return;
		touchActive = false;
		figurePinchDist = 0;
		if (reduceMotion || closeRequested || figureFill) return;
		if (!canDismiss) return;
		if (rawPull > DEAD_ZONE) settleDismiss();
		else if (rawPull > 0) clearDismiss();
	}

	/**
	 * Close = exact reverse of open: same two layout states, same stage geometry
	 * (--sheet-h), same canvas cover. Only difference is direction (open→thumb).
	 */
	function beginClose(epoch = closeEpoch) {
		if (phase === 'closing') return;

		cancelAnimationFrame(openFrame);
		cancelAnimationFrame(closeFrame);
		clearTimeout(settleTimer);
		clearTimeout(contentTimer);
		touchActive = false;
		contentVisible = false;
		rawPull = 0;
		clearPullSamples();
		paintRing(0);

		if (!cardEl) {
			finishClose(epoch);
			return;
		}

		if (reduceMotion) {
			phase = 'closing';
			expanded = false;
			finishClose(epoch);
			return;
		}

		// Continue from the live preview pose (up to 10% along the path) into the thumb.
		const from = currentCardRect();
		const thumb = thumbRect();
		const duration = motion.closeDuration;
		const ease = motion.closeEase;

		phase = 'closing';
		// Drop expanded now so the shade fades with the morph (not on unmount).
		expanded = false;
		morphing = true;
		if (scrollerEl) scrollerEl.scrollTop = 0;
		prepareHero();
		startCoverPaint();
		applyChrome(cardEl, from, false);

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (epoch !== closeEpoch) return;
				if (!cardEl) {
					finishClose(epoch);
					return;
				}
				applyChrome(cardEl, thumb, true, {
					duration,
					ease
				});

				const started = performance.now();
				const keepAlive = () => {
					if (epoch !== closeEpoch || phase !== 'closing') return;
					if (videoEl && videoEl.paused) void videoEl.play().catch(() => {});
					if (performance.now() - started < duration) {
						closeFrame = requestAnimationFrame(keepAlive);
					}
				};
				closeFrame = requestAnimationFrame(keepAlive);

				clearTimeout(closeTimer);
				closeTimer = setTimeout(() => finishClose(epoch), duration);
			});
		});
	}

	function clearEscapeScroll() {
		escapeScrollPending = false;
		clearTimeout(escapeScrollTimer);
		escapeScrollTimer = undefined;
		escapeScrollCleanup?.();
		escapeScrollCleanup = undefined;
	}

	/**
	 * Escape / backdrop: scroll to top first (when needed), then run the close morph.
	 * A second trigger while scrolling jumps to top and closes immediately.
	 *
	 * Uses a short eased scrub (not browser `scroll-behavior: smooth`) so the
	 * lead-in matches Snap close instead of a ~0.5–1s browser glide.
	 */
	function dismissWithScrollFirst() {
		if (phase === 'closing' || closeRequested) return;

		if (escapeScrollPending) {
			clearEscapeScroll();
			if (scrollerEl) scrollerEl.scrollTop = 0;
			close();
			return;
		}

		if (!scrollerEl || atScrollTop()) {
			close();
			return;
		}

		if (reduceMotion) {
			scrollerEl.scrollTop = 0;
			close();
			return;
		}

		const scroller = scrollerEl;
		const from = scroller.scrollTop;
		escapeScrollPending = true;
		hideCloseHint();

		// Kill trackpad inertia so it can't fight the programmatic scrub.
		scroller.scrollTo({ top: from, behavior: 'auto' });

		const finish = () => {
			if (!escapeScrollPending) return;
			clearEscapeScroll();
			scroller.scrollTop = 0;
			close();
		};

		// Short distance — snap straight to top.
		if (from < 120) {
			finish();
			return;
		}

		// Keep the lead-in in the same tempo as the close morph.
		const duration = Math.min(240, Math.max(motion.closeDuration, 90 + from * 0.08));
		const started = performance.now();
		let frame = 0;

		const tick = (now: number) => {
			if (!escapeScrollPending) return;
			const t = Math.min(1, (now - started) / duration);
			// Soft-land style ease-out — fast start, gentle arrive at top.
			const eased = 1 - (1 - t) ** 3;
			scroller.scrollTop = from * (1 - eased);
			if (t < 1) {
				frame = requestAnimationFrame(tick);
				return;
			}
			finish();
		};

		escapeScrollCleanup = () => {
			cancelAnimationFrame(frame);
		};

		escapeScrollTimer = setTimeout(() => {
			if (!escapeScrollPending) return;
			scroller.scrollTop = 0;
			finish();
		}, duration + 80);

		frame = requestAnimationFrame(tick);
	}

	function close() {
		if (phase === 'closing' || closeRequested) return;
		clearTimeout(figureFillTimer);
		figureFillEpoch += 1;
		cancelFigureFly();
		cancelFigureStage();
		figureFill = null;
		figureFillMorphing = false;
		setCaseFigureThumbHidden(null);
		clearEscapeScroll();
		closeRequested = true;
		rawPull = Math.min(rawPull, PULL_RANGE);
		// Freeze scroll immediately — wheel handlers still run until the morph starts.
		if (scrollerEl) scrollerEl.scrollTop = 0;

		const epoch = ++closeEpoch;
		// Pop / strip `?project=` for UI + scroll dismiss — browser Back already cleared state.
		pendingHistoryPop =
			Boolean(page.state.projectId) ||
			Boolean(projectIdFromUrl(page.url)) ||
			Boolean(projectIdFromUrl(new URL(location.href)));

		touchActive = false;
		clearPullSamples();
		clearTimeout(settleTimer);

		// Back during the open morph — tear down without waiting for settle.
		if (phase === 'opening') {
			beginClose(epoch);
			return;
		}

		// Reverse of open's post-morph content reveal: hide details, then morph.
		if (contentVisible) {
			contentVisible = false;
			paintRing(0);
			rawPull = 0;
			clearTimeout(closeTimer);
			closeTimer = setTimeout(() => {
				if (epoch !== closeEpoch) return;
				beginClose(epoch);
			}, motion.closeContentMs);
			return;
		}

		beginClose(epoch);
	}

	/**
	 * After the sheet unmounts, macOS trackpad inertia still emits wheel events.
	 * Those were preventDefault'd while open — once the listener is gone they
	 * scroll the page (usually upward, from scroll-to-dismiss). Pin briefly.
	 */
	function lockPageScrollBriefly(ms = 480) {
		if (!browser) return;
		pageScrollLockCleanup?.();
		clearTimeout(pageScrollLockTimer);

		const x = window.scrollX;
		const y = window.scrollY;
		const wheelOpts: AddEventListenerOptions = { passive: false, capture: true };
		const scrollOpts: AddEventListenerOptions = { capture: true, passive: true };

		const blockWheel = (event: WheelEvent) => {
			event.preventDefault();
		};
		const blockTouch = (event: TouchEvent) => {
			if (event.cancelable) event.preventDefault();
		};
		const pinScroll = () => {
			if (window.scrollX !== x || window.scrollY !== y) {
				window.scrollTo(x, y);
			}
		};

		window.addEventListener('wheel', blockWheel, wheelOpts);
		window.addEventListener('touchmove', blockTouch, wheelOpts);
		window.addEventListener('scroll', pinScroll, scrollOpts);

		pageScrollLockCleanup = () => {
			window.removeEventListener('wheel', blockWheel, wheelOpts);
			window.removeEventListener('touchmove', blockTouch, wheelOpts);
			window.removeEventListener('scroll', pinScroll, scrollOpts);
			pageScrollLockCleanup = undefined;
		};

		pageScrollLockTimer = setTimeout(() => {
			pageScrollLockCleanup?.();
		}, ms);
	}

	function finishClose(epoch = closeEpoch) {
		if (epoch !== closeEpoch) return;

		cancelAnimationFrame(closeFrame);
		clearTimeout(figureFillTimer);
		figureFillEpoch += 1;
		cancelFigureFly();
		cancelFigureStage();
		figureFill = null;
		figureFillMorphing = false;
		setCaseFigureThumbHidden(null);
		stopCoverPaint();
		// Capture before body overflow unlock / history.back can shift the page.
		lockPageScrollBriefly();
		// Return the borrowed video to the card BEFORE unlifting / unmounting.
		returnVideo();
		videoEl = undefined;
		rendered = false;
		expanded = false;
		contentVisible = false;
		clearHintTimer();
		hintReady = false;
		hintVisible = false;
		scrollThumb = { top: 0, height: 0, visible: false };
		thumbDragging = false;
		morphing = false;
		phase = 'opening';
		rawPull = 0;
		ringProgress = 0;
		clearPullSamples();
		openRect = null;
		sheetH = 0;
		videoReady = false;
		touchActive = false;
		id = null;
		origin = null;
		closeRequested = false;
		clearEscapeScroll();
		const shouldPop = pendingHistoryPop;
		pendingHistoryPop = false;
		const focusEl = restoreFocusEl;
		restoreFocusEl = null;
		// Clear store first so URL sync (Back) does not re-trigger close().
		clearProject();
		if (shouldPop) syncUrlAfterClose();
		queueMicrotask(() => focusEl?.focus({ preventScroll: true }));
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target !== event.currentTarget) return;
		if (figureFill) {
			closeFigureFill();
			return;
		}
		if (canDismiss) dismissWithScrollFirst();
	}

	function isTypingTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return (
			tag === 'INPUT' ||
			tag === 'TEXTAREA' ||
			tag === 'SELECT' ||
			target.isContentEditable
		);
	}

	function isActivateableTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest('a[href], button, summary, [role="button"], input, textarea, select, label')
		);
	}

	function focusScroller() {
		scrollerEl?.focus({ preventScroll: true });
	}

	function scrollSheetBy(delta: number) {
		if (!scrollerEl) return false;
		const maxScroll = Math.max(0, scrollerEl.scrollHeight - scrollerEl.clientHeight);
		const next = Math.min(maxScroll, Math.max(0, scrollerEl.scrollTop + delta));
		if (next === scrollerEl.scrollTop) return false;
		scrollerEl.scrollTop = next;
		return true;
	}

	function onKeydown(event: KeyboardEvent) {
		if (!rendered) return;

		if (event.key === 'Escape') {
			if (figureFill) {
				event.preventDefault();
				closeFigureFill();
				return;
			}
			if (canDismiss) {
				event.preventDefault();
				dismissWithScrollFirst();
			}
			return;
		}

		// Image viewer keys — zoom and scroll.
		if (figureFill && !figureFillMorphing) {
			if (event.key === '+' || event.key === '=') {
				event.preventDefault();
				bumpFigureZoom(1);
				return;
			}
			if (event.key === '-' || event.key === '_') {
				event.preventDefault();
				bumpFigureZoom(-1);
				return;
			}
			if (
				event.key === 'ArrowDown' ||
				event.key === 'ArrowUp' ||
				event.key === 'PageDown' ||
				event.key === 'PageUp' ||
				event.key === 'Home' ||
				event.key === 'End' ||
				event.key === ' '
			) {
				event.preventDefault();
				const page = Math.max(120, Math.round((figureScrollerEl?.clientHeight ?? 600) * 0.85));
				const line = 48;
				const down =
					event.key === 'ArrowDown' ||
					event.key === 'PageDown' ||
					event.key === 'End' ||
					(event.key === ' ' && !event.shiftKey);
				const step =
					event.key === 'PageDown' || event.key === 'PageUp' || event.key === ' '
						? page
						: event.key === 'Home' || event.key === 'End'
							? Number.POSITIVE_INFINITY
							: line;
				const delta = down ? step : -step;
				if (event.key === 'Home' && figureScrollerEl) {
					figureScrollerEl.scrollTop = 0;
					return;
				}
				if (event.key === 'End' && figureScrollerEl) {
					figureScrollerEl.scrollTop = figureScrollerEl.scrollHeight;
					return;
				}
				figureScrollBy(delta);
				return;
			}
		}

		if (!canDismiss || !scrollerEl || morphing || closeRequested || escapeScrollPending) return;
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;

		const scroller = scrollerEl;
		const line = Math.max(40, Math.round(scroller.clientHeight * 0.12));
		const page = Math.max(line, Math.round(scroller.clientHeight * 0.85));

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				scrollSheetBy(line);
				return;
			case 'ArrowUp':
				event.preventDefault();
				scrollSheetBy(-line);
				return;
			case 'PageDown':
				event.preventDefault();
				scrollSheetBy(page);
				return;
			case 'PageUp':
				event.preventDefault();
				scrollSheetBy(-page);
				return;
			case 'Home':
				event.preventDefault();
				scroller.scrollTop = 0;
				return;
			case 'End':
				event.preventDefault();
				scroller.scrollTop = scroller.scrollHeight;
				return;
			case ' ':
				if (isActivateableTarget(event.target)) return;
				event.preventDefault();
				scrollSheetBy(event.shiftKey ? -page : page);
				return;
		}
	}

	function onResize() {
		if ((!canDismiss && !figureFilled) || !cardEl || !expanded) return;
		openRect = finalRect();
		sheetH = openRect.height;
		applyChrome(cardEl, openRect, false);
		updateScrollThumb();
		if (figureFill) {
			syncFigureCentering();
			syncFigureMinimap();
		}
	}

	// Shallow history: SvelteKit stores the case in `page.state` (Back/Forward).
	// `?project=` is for the address bar / refresh; cold load waits for the card thumb
	// so open morphs from it (same path as click / Forward) instead of the inset fallback.
	$effect(() => {
		if (!browser) return;

		const stateId = page.state.projectId ?? null;
		const urlId = projectIdFromUrl(page.url) ?? projectIdFromUrl(new URL(location.href));
		const targetId = projectIdFromPage(page);

		// Shared / refreshed link: paint the page first, then hydrate once the thumb
		// exists so the open path below can morph from it (not the inset fallback).
		if (!stateId && urlId && getWorkProject(urlId) && shouldHydrateProjectFromUrl(urlId)) {
			const controller = new AbortController();
			void waitForProjectSource(urlId, { signal: controller.signal }).then(() => {
				if (controller.signal.aborted) return;
				hydrateProjectFromUrl(urlId);
			});
			return () => controller.abort();
		}

		untrack(() => {
			if (targetId && getWorkProject(targetId)) {
				if (targetId !== id) {
					openProject(targetId, undefined, undefined, { syncUrl: false });
				}
				return;
			}

			// Browser Back cleared shallow state while the sheet is up.
			if ((rendered || id) && phase !== 'closing') {
				close();
			}
		});
	});

	$effect(() => {
		const unsubMotion = activeMotion.subscribe((value) => {
			motion = value;
		});
		const unsubId = openProjectId.subscribe((value) => {
			clearTimeout(closeTimer);
			clearTimeout(contentTimer);
			clearTimeout(settleTimer);
			cancelAnimationFrame(openFrame);
			cancelAnimationFrame(closeFrame);

			if (value) {
				// Invalidate any in-flight close so Forward isn't undone by finishClose.
				closeEpoch += 1;
				pendingHistoryPop = false;
				closeRequested = false;
				phase = 'opening';
				morphing = true;
				ringProgress = 0;
				rawPull = 0;
				clearPullSamples();
				openRect = null;
				sheetH = 0;
				videoReady = false;
				contentVisible = false;
				id = value;
				rendered = true;
				expanded = false;
				expandedFigures = {};
			}
		});
		const unsubOrigin = projectOrigin.subscribe((value) => {
			origin = value;
		});
		return () => {
			unsubMotion();
			unsubId();
			unsubOrigin();
			clearTimeout(closeTimer);
			clearTimeout(contentTimer);
			clearTimeout(settleTimer);
			cancelAnimationFrame(openFrame);
			cancelAnimationFrame(closeFrame);
			stopCoverPaint();
		};
	});

	$effect(() => {
		if (!browser || !rendered || !cardEl || !project) return;

		// Re-measure the live thumb before locking scroll — Forward/shared links
		// need the same FLIP origin as a click, and scrollbar removal shifts layout.
		// untrack: don't re-run this morph when we write origin back into the store.
		const fromSource = untrack(() => {
			const live = captureProjectOrigin(project.id, null, {
				scrollIntoView: !origin
			});
			if (live) {
				origin = live;
				projectOrigin.set(live);
				return live;
			}
			return origin;
		});

		document.body.style.overflow = 'hidden';
		restoreFocusEl =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		phase = 'opening';
		morphing = true;
		rawPull = 0;
		ringProgress = 0;
		clearPullSamples();
		contentVisible = false;

		const target = finalRect();
		openRect = target;
		sheetH = target.height;
		const from: Rect = fromSource
			? withPxRadius({
					top: fromSource.top,
					left: fromSource.left,
					width: fromSource.width,
					height: fromSource.height,
					radius: fromSource.radius
				})
			: withPxRadius({
					top: target.top + 24,
					left: target.left + 24,
					width: target.width - 48,
					height: target.height - 48,
					radius: '1.75rem'
				});

		const revealContent = () => {
			if (phase !== 'open') return;
			contentVisible = true;
			scheduleCloseHint();
			if (scrollerEl) scrollerEl.scrollTop = 0;
			focusScroller();
			requestAnimationFrame(updateScrollThumb);
			if (videoEl) void videoEl.play().catch(() => {});
		};

		if (reduceMotion) {
			applyChrome(cardEl, target, false);
			expanded = true;
			phase = 'open';
			morphing = false;
			stopCoverPaint();
			revealContent();
		} else {
			applyChrome(cardEl, from, false);
			openFrame = requestAnimationFrame(() => {
				openFrame = requestAnimationFrame(() => {
					if (!cardEl || phase === 'closing') return;
					applyChrome(cardEl, target, true);
					expanded = true;
					phase = 'open';
					if (scrollerEl) scrollerEl.scrollTop = 0;
					if (videoEl) void videoEl.play().catch(() => {});
					clearTimeout(contentTimer);
					contentTimer = setTimeout(() => {
						morphing = false;
						stopCoverPaint();
						revealContent();
					}, motion.openDuration);
				});
			});
		}

		return () => {
			document.body.style.overflow = '';
			stopCoverPaint();
		};
	});

	/** Borrow after the mount node exists (same tick as open morph). */
	$effect(() => {
		if (!browser || !rendered || !videoMount || !origin?.video) return;
		attachHeroVideo();
		prepareHero();
		if (morphing) startCoverPaint();
	});

	/** Always return the borrowed decoder when the sheet unmounts. */
	$effect(() => {
		if (!rendered) return;
		return () => {
			returnVideo();
			videoEl = undefined;
		};
	});

	$effect(() => {
		if (!browser || !expanded || !canDismiss || !scrollerEl) return;

		const scroller = scrollerEl;
		const passive: AddEventListenerOptions = { passive: true };
		const onScroll = () => {
			// Momentum can still try to show a gap above the hero — pin hard to 0.
			if (scroller.scrollTop < 0) scroller.scrollTop = 0;
			syncTopOverscrollLock();
			updateScrollThumb();
			if (scroller.scrollTop > DEAD_ZONE) hideCloseHint();
			else if (
				scroller.scrollTop <= 0.5 &&
				rawPull <= DEAD_ZONE &&
				contentVisible &&
				!closeRequested &&
				phase === 'open'
			) {
				scheduleCloseHint();
			}
		};

		scroller.addEventListener('scroll', onScroll, passive);
		syncTopOverscrollLock();
		updateScrollThumb();

		const ro =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => updateScrollThumb())
				: null;
		ro?.observe(scroller);

		return () => {
			scroller.removeEventListener('scroll', onScroll, passive);
			ro?.disconnect();
		};
	});

	$effect(() => {
		if (!browser || !scrollerEl || !rendered) return;
		// Keep listening through close morph, and while a figure fill is open.
		if (phase !== 'closing' && (!expanded || (!canDismiss && !figureFilled))) return;

		const scroller = scrollerEl;
		const passive: AddEventListenerOptions = { passive: true };
		// Window-level wheel: dismiss + scroll content even over the backdrop.
		const wheelOpts: AddEventListenerOptions = { passive: false, capture: true };
		const touchMoveOpts: AddEventListenerOptions = { passive: false };
		const lockScroll = () => {
			if ((closeRequested || phase === 'closing') && scroller.scrollTop !== 0) {
				scroller.scrollTop = 0;
			}
			pinSheetScrollLock();
		};

		window.addEventListener('wheel', onWheel, wheelOpts);
		scroller.addEventListener('scroll', lockScroll, passive);

		// Also listen on the card so figure-fill (covers the scroller) still gets touch.
		const touchRoot = cardEl ?? scroller;

		if (!reduceMotion && phase !== 'closing') {
			touchRoot.addEventListener('touchstart', onTouchStart, passive);
			touchRoot.addEventListener('touchmove', onTouchMove, touchMoveOpts);
			touchRoot.addEventListener('touchend', onTouchEnd, passive);
			touchRoot.addEventListener('touchcancel', onTouchEnd, passive);
		}

		return () => {
			window.removeEventListener('wheel', onWheel, wheelOpts);
			scroller.removeEventListener('scroll', lockScroll, passive);
			touchRoot.removeEventListener('touchstart', onTouchStart, passive);
			touchRoot.removeEventListener('touchmove', onTouchMove, touchMoveOpts);
			touchRoot.removeEventListener('touchend', onTouchEnd, passive);
			touchRoot.removeEventListener('touchcancel', onTouchEnd, passive);
		};
	});
</script>

<svelte:window onkeydown={onKeydown} onresize={onResize} />

{#if rendered && project}
	<div
		bind:this={backdropEl}
		class="backdrop"
		class:expanded
		role="presentation"
		style:--motion-backdrop="{expanded ? motion.backdropMs : motion.closeBackdropMs}ms"
		style:--motion-content="{contentVisible ? motion.contentMs : motion.closeContentMs}ms"
		style:--motion-ease={expanded ? motion.openEase : motion.closeEase}
		onclick={onBackdropClick}
	>
		<div
			bind:this={cardEl}
			class="card"
			class:expanded
			class:content={contentVisible}
			class:dismissing={isDismissing}
			class:closing={isClosing}
			class:morphing
			class:figure-filled={figureFilled}
			class:figure-morphing={figureFillMorphing}
			role="dialog"
			aria-modal="true"
			aria-labelledby="project-card-title"
			tabindex="-1"
			style:--sheet-h="{sheetH}px"
		>
			<SheetClose
				visible={contentVisible && canDismiss && !figureFilled && !morphing && !isClosing}
				tone="media"
				bind:hot={closeHot}
				onclick={() => dismissWithScrollFirst()}
			/>

			<p
				class="close-hint"
				class:visible={hintVisible && contentVisible && canDismiss && !closeHot}
				aria-hidden={!(hintVisible && contentVisible && canDismiss && !closeHot)}
			>
				Click, scroll up, or press <kbd>esc</kbd> to close
			</p>

			<div bind:this={ringEl} class="dismiss-ring" aria-hidden="true">
				<svg viewBox="0 0 36 36">
					<circle class="ring-track" cx="18" cy="18" r="15" />
					<circle class="ring-progress" cx="18" cy="18" r="15" />
				</svg>
			</div>

			<div
				class="scroll-rail"
				class:visible={scrollThumb.visible &&
					contentVisible &&
					!figureFilled &&
					!isClosing &&
					!morphing &&
					!isDismissing}
				aria-hidden="true"
			>
				<button
					type="button"
					class="scroll-thumb"
					class:dragging={thumbDragging}
					tabindex="-1"
					style:transform="translate3d(0, {scrollThumb.top}px, 0)"
					style:height="{scrollThumb.height}px"
					aria-label="Scroll case study"
					onpointerdown={onThumbPointerDown}
				></button>
			</div>

			<div class="scroller" bind:this={scrollerEl} tabindex="-1">
				<!-- Hero is in normal flow so it scrolls away with the case study. -->
				<section class="stage">
					<div
						bind:this={heroEl}
						class="hero"
						aria-hidden="true"
						style:background-image={origin?.poster
							? `url(${origin.poster})`
							: project.poster
								? `url(${project.poster})`
								: undefined}
					>
						{#if project.video || origin?.video}
							<canvas bind:this={coverCanvas} class="hero-cover" aria-hidden="true"></canvas>
							<!-- Borrowed card <video> is mounted here (one decoder). -->
							<div
								bind:this={videoMount}
								class="hero-video-mount"
								class:ready={videoReady || Boolean(origin?.poster)}
							></div>
						{/if}
					</div>

					<div class="caption">
						<div class="caption-inner">
							<h2 id="project-card-title">{sheetTitle}</h2>
							<p>{project.description}</p>
						</div>
					</div>
				</section>

				<section class="details" class:coming-soon={project.comingSoon}>
					<div class="details-inner">
						<dl class="meta">
							{#if project.role}
								<div>
									<dt>
										{project.metaLabels?.role ??
											(project.role.includes(',') ? 'Roles' : 'Role')}
									</dt>
									<dd>{project.role}</dd>
								</div>
							{/if}
							{#if project.services}
								<div>
									<dt>{project.metaLabels?.services ?? 'Services'}</dt>
									<dd>{project.services}</dd>
								</div>
							{/if}
							<div>
								<dt>{project.metaLabels?.year ?? 'Year'}</dt>
								<dd>{project.year}</dd>
							</div>
							{#if project.stage}
								<div>
									<dt>Stage</dt>
									<dd>{project.stage}</dd>
								</div>
							{/if}
							{#if project.link}
								<div>
									<dt>Link</dt>
									<dd>
										<a href={project.link.href} target="_blank" rel="noopener noreferrer">
											{project.link.label}
										</a>
									</dd>
								</div>
							{/if}
						</dl>

						{#if project.comingSoon}
							<div class="coming-soon-panel">
								<h3 class="coming-soon-title">Coming soon</h3>
								<p class="coming-soon-copy">
									A fuller write-up of this project is on the way. The overview above covers
									the gist for now.
								</p>
							</div>
						{:else if project.caseStudy?.length}
							{#each project.caseStudy as block, index (`${block.type}-${index}`)}
								{#if block.type === 'heading'}
									<h3 class="case-heading">{block.text}</h3>
								{:else if block.type === 'paragraph'}
									<p class="case-copy">{block.text}</p>
								{:else if block.type === 'logos'}
									<div class="case-logos">
										<CaseLogos items={block.items} />
									</div>
								{:else if block.type === 'timeline'}
									<RoleTimeline roles={block.roles} />
								{:else if block.type === 'embed'}
									<figure
										class="case-figure case-embed"
										class:is-diagram={block.embed !== 'menu'}
									>
										<div class="case-ph framed embed-stage">
											{#if block.embed === 'menu'}
												<MenuComponent />
											{:else if block.embed !== 'menu'}
												<CaseDiagram kind={block.embed} />
											{/if}
										</div>
										{#if block.caption}
											<figcaption>{block.caption}</figcaption>
										{/if}
									</figure>
								{:else if block.type === 'figure'}
									{@const figKey = `fig-${index}`}
									<figure
										class="case-figure ratio-{block.ratio ?? 'wide'}"
										class:expandable={Boolean(block.expand)}
										class:expanded={!block.expand || expandedFigures[figKey]}
										class:peek={Boolean(block.peek)}
										use:figureExpandOnView={block.expand ? figKey : ''}
									>
										{#if block.src}
											<CaseFigureMagnet>
												<button
													type="button"
													class="case-ph"
													class:has-image={true}
													class:has-backdrop={Boolean(block.background)}
													class:framed={Boolean(block.framed || block.background)}
													class:peek={Boolean(block.peek)}
													class:scaled={typeof block.scale === 'number'}
													class:fill={Boolean(block.fill)}
													class:is-figure-open={figureOpenKey === figKey}
													data-figure-key={figKey}
													aria-label={block.caption
														? `Open figure: ${block.caption}`
														: 'Open figure'}
													style:background={block.background}
													style:--figure-scale={typeof block.scale === 'number'
														? String(block.scale)
														: null}
													onclick={(event) =>
														openFigureFill(event, {
															key: figKey,
															ratio: block.ratio ?? 'wide',
															caption: block.caption,
															src: block.src,
															background: block.background,
															framed: Boolean(block.framed || block.background),
															peek: Boolean(block.peek)
														})}
												>
													<img
														src={block.src}
														alt=""
														width="1024"
														height="665"
														decoding="async"
														draggable="false"
													/>
												</button>
											</CaseFigureMagnet>
										{:else}
											<div
												class="case-ph"
												class:has-backdrop={Boolean(block.background)}
												class:framed={Boolean(block.framed || block.background)}
												class:peek={Boolean(block.peek)}
												class:scaled={typeof block.scale === 'number'}
												class:fill={Boolean(block.fill)}
												style:background={block.background}
												style:--figure-scale={typeof block.scale === 'number'
													? String(block.scale)
													: null}
											></div>
										{/if}
										{#if block.caption}
											<figcaption>{block.caption}</figcaption>
										{/if}
									</figure>
								{:else if block.type === 'figures'}
									<div
										class="case-figures count-{block.count}"
										aria-label={block.captions?.join(', ') || 'Figure group'}
									>
										{#each Array.from({ length: block.count }, (_, i) => i) as figIndex (
											figIndex
										)}
											{@const figFramed = Boolean(
												(Array.isArray(block.framed)
													? block.framed[figIndex]
													: block.framed) || block.backgrounds?.[figIndex]
											)}
											{@const figPeek = Boolean(
												Array.isArray(block.peek) ? block.peek[figIndex] : block.peek
											)}
											<figure
												class="case-figure ratio-{block.ratio ?? 'square'}"
												class:peek={figPeek}
											>
											{#if block.srcs?.[figIndex]}
												<CaseFigureMagnet>
													<button
														type="button"
														class="case-ph"
														class:has-image={true}
														class:has-backdrop={Boolean(block.backgrounds?.[figIndex])}
														class:framed={figFramed}
														class:peek={figPeek}
														class:is-figure-open={figureOpenKey ===
															`figs-${index}-${figIndex}`}
														data-figure-key="figs-{index}-{figIndex}"
														aria-label={block.captions?.[figIndex]
															? `Open figure: ${block.captions[figIndex]}`
															: 'Open figure'}
														style:background={block.backgrounds?.[figIndex]}
														onclick={(event) =>
															openFigureFill(event, {
																key: `figs-${index}-${figIndex}`,
																ratio: block.ratio ?? 'square',
																caption: block.captions?.[figIndex],
																src: block.srcs?.[figIndex],
																background: block.backgrounds?.[figIndex],
																framed: figFramed,
																peek: figPeek
															})}
													>
														<img
															src={block.srcs[figIndex]}
															alt=""
															draggable="false"
														/>
													</button>
												</CaseFigureMagnet>
											{:else}
												<div
													class="case-ph"
													class:has-backdrop={Boolean(block.backgrounds?.[figIndex])}
													class:framed={figFramed}
													class:peek={figPeek}
													style:background={block.backgrounds?.[figIndex]}
												></div>
											{/if}
												{#if block.captions?.[figIndex]}
													<figcaption>{block.captions[figIndex]}</figcaption>
												{/if}
											</figure>
										{/each}
									</div>
								{:else if block.type === 'phones'}
									<div class="case-phones">
										<CasePhones
											screens={block.screens}
											blockIndex={index}
											openKey={figureOpenKey}
											onOpen={(event, screen, i) => {
												if (!screen.src) return;
												openFigureFill(event, {
													key: `phones-${index}-${i}`,
													ratio: 'tall',
													caption: screen.caption,
													src: screen.src,
													background: screen.background,
													framed: false,
													peek: false
												});
											}}
										/>
									</div>
								{:else if block.type === 'qa'}
									<article class="case-qa">
										<h3 class="case-q">{block.q}</h3>
										{#each (typeof block.a === 'string' ? [block.a] : block.a) as para, paraIndex (`${index}-${paraIndex}`)}
											<p class="case-copy">{para}</p>
										{/each}
									</article>
								{:else if block.type === 'list'}
									<div class="highlights" aria-label={block.title}>
										<h3>{block.title}</h3>
										<ul>
											{#each block.items as item (item)}
												<li>{item}</li>
											{/each}
										</ul>
									</div>
								{/if}
							{/each}
						{:else}
							{#each project.body as paragraph (paragraph)}
								<p>{paragraph}</p>
							{/each}

							{#if project.highlights?.length}
								<div class="highlights" aria-label="Highlights">
									<h3>Highlights</h3>
									<ul>
										{#each project.highlights as item (item)}
											<li>{item}</li>
										{/each}
									</ul>
								</div>
							{/if}
						{/if}
					</div>
				</section>
			</div>

			{#if figureFill}
				<div
					bind:this={figureFillEl}
					class="figure-fill"
					class:morphing={figureFillMorphing}
					class:peek={Boolean(figureFill.peek)}
					class:light={figureFillIsLight(figureFill.background)}
					class:has-backdrop={Boolean(figureFill.background)}
					class:framed={Boolean(figureFill.framed || figureFill.peek)}
					role="dialog"
					aria-modal="true"
					tabindex="-1"
					aria-label={figureFill.caption ?? 'Figure'}
					style:--figure-zoom={figureZoom}
					style:background={figureFill.background}
				>
					<div class="figure-stage" bind:this={figureStageEl} aria-hidden="true"></div>
					{#if figureFill.src}
						<div class="figure-fly-clip" bind:this={figureFlyClipEl} aria-hidden="true">
							<img
								bind:this={figureFlyEl}
								class="figure-fly-image"
								src={figureFill.src}
								alt=""
								draggable="false"
							/>
						</div>
					{/if}
					<div class="figure-chrome" class:dimmed={figureFillMorphing}>
						<button
							type="button"
							class="figure-btn figure-close"
							aria-label="Close image"
							onclick={() => closeFigureFill()}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path
									d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"
									fill="none"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
								/>
							</svg>
						</button>
						{#if figureMinimap.visible}
							<button
								type="button"
								class="figure-minimap"
								aria-label="Navigate canvas"
								onpointerdown={onFigureMinimapPointerDown}
								onpointermove={onFigureMinimapPointerMove}
								onpointerup={onFigureMinimapPointerUp}
								onpointercancel={onFigureMinimapPointerUp}
							>
								<span
									class="figure-minimap-canvas"
									style:aspect-ratio={figureMinimap.aspect}
									aria-hidden="true"
								>
									<span
										class="figure-minimap-image"
										style:left="{figureMinimap.image.left}%"
										style:top="{figureMinimap.image.top}%"
										style:width="{figureMinimap.image.width}%"
										style:height="{figureMinimap.image.height}%"
									></span>
									<span
										class="figure-minimap-view"
										style:left="{figureMinimap.view.left}%"
										style:top="{figureMinimap.view.top}%"
										style:width="{figureMinimap.view.width}%"
										style:height="{figureMinimap.view.height}%"
									></span>
								</span>
							</button>
						{/if}
						<div class="figure-zoom" role="group" aria-label="Zoom">
							<button
								type="button"
								class="figure-btn"
								aria-label="Zoom out"
								disabled={!canFigureZoomOut}
								onclick={() => bumpFigureZoom(-1)}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M6 12h12"
										fill="none"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
									/>
								</svg>
							</button>
							<button
								type="button"
								class="figure-btn"
								aria-label="Zoom in"
								disabled={!canFigureZoomIn}
								onclick={() => bumpFigureZoom(1)}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path
										d="M12 6v12M6 12h12"
										fill="none"
										stroke="currentColor"
										stroke-width="1.75"
										stroke-linecap="round"
									/>
								</svg>
							</button>
						</div>
						<div
							class="scroll-rail figure-scroll-rail-y"
							class:visible={figureScrollThumbY.visible && !figureFillMorphing}
							aria-hidden="true"
						>
							<button
								type="button"
								class="scroll-thumb"
								class:dragging={figureThumbDragging}
								tabindex="-1"
								style:transform="translate3d(0, {figureScrollThumbY.top}px, 0)"
								style:height="{figureScrollThumbY.height}px"
								aria-label="Scroll image vertically"
								onpointerdown={onFigureThumbYPointerDown}
							></button>
						</div>
						<div
							bind:this={figureScrollRailXEl}
							class="scroll-rail figure-scroll-rail-x"
							class:visible={figureScrollThumbX.visible && !figureFillMorphing}
							class:has-minimap={figureMinimap.visible}
							aria-hidden="true"
						>
							<button
								type="button"
								class="scroll-thumb figure-scroll-thumb-x"
								class:dragging={figureThumbDragging}
								tabindex="-1"
								style:transform="translate3d({figureScrollThumbX.left}px, 0, 0)"
								style:width="{figureScrollThumbX.width}px"
								aria-label="Scroll image horizontally"
								onpointerdown={onFigureThumbXPointerDown}
							></button>
						</div>
					</div>
					<div
						class="figure-scroll"
						bind:this={figureScrollerEl}
						onscroll={syncFigureMinimap}
						onpointerdown={onFigurePanPointerDown}
						onpointermove={onFigurePanPointerMove}
						onpointerup={onFigurePanPointerUp}
						onpointercancel={onFigurePanPointerUp}
					>
						<div class="figure-page">
							{#if figureFill.src}
								<img
									class="figure-image"
									src={figureFill.src}
									alt={figureFill.caption ?? ''}
									decoding="async"
									draggable="false"
									onload={onFigureImageLoad}
								/>
							{:else}
								<div class="case-ph figure-image" aria-hidden="true"></div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		background: rgb(0 0 0 / 0);
		transition: background-color var(--motion-backdrop, 320ms) var(--motion-ease, ease);
	}

	.backdrop.expanded {
		background: rgb(0 0 0 / calc(0.4 * (1 - var(--dismiss-progress, 0))));
	}

	.card {
		--project-copy-width: var(--span-4);
		position: fixed;
		z-index: 81;
		overflow: hidden;
		background: var(--color-bg);
		color: var(--color-text);
		outline: none;
	}

	.card.dismissing {
		cursor: grabbing;
	}

	.card.closing {
		background: #111;
	}

	/* Full-window image viewer. */
	.figure-fill {
		/* Tuck chrome into the rounded corners (matches ~1.75rem sheet radius). */
		--figure-chrome-inset: 0.4rem;
		position: absolute;
		z-index: 12;
		overflow: hidden;
		/* Same fill as framed case thumbs; inline style wins when a custom bg is set. */
		background: #111;
		outline: none;
		touch-action: none;
	}

	.figure-fill.framed {
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
	}

	.figure-stage {
		position: absolute;
		inset: 0;
		z-index: 0;
		opacity: 0;
		pointer-events: none;
		background: inherit;
	}

	/* Clip window + bitmap; peek keeps the oversized top-left crop during the zoom. */
	.figure-fly-clip {
		position: absolute;
		z-index: 2;
		overflow: hidden;
		pointer-events: none;
		visibility: hidden;
	}

	.figure-fly-image {
		position: absolute;
		display: block;
		max-width: none;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.figure-chrome {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
		opacity: 1;
		transition: opacity 160ms ease;
	}

	.figure-chrome.dimmed {
		opacity: 0;
	}

	.figure-btn {
		appearance: none;
		pointer-events: auto;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 999px;
		/* Same fill as the figure minimap canvas. */
		background: color-mix(in srgb, var(--color-text) 28%, var(--color-bg));
		color: #fff;
		cursor: pointer;
		box-shadow: none;
		transition:
			background-color 140ms ease,
			opacity 140ms ease,
			transform 140ms ease;
	}

	.figure-btn svg {
		display: block;
		width: 1.15rem;
		height: 1.15rem;
	}

	.figure-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-text) 40%, var(--color-bg));
	}

	.figure-btn:active:not(:disabled) {
		transform: scale(0.96);
	}

	.figure-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.figure-btn:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	.figure-close {
		position: absolute;
		z-index: 5;
		top: var(--figure-chrome-inset);
		right: var(--figure-chrome-inset);
	}

	.figure-minimap {
		appearance: none;
		pointer-events: auto;
		position: absolute;
		z-index: 5;
		left: var(--figure-chrome-inset);
		bottom: var(--figure-chrome-inset);
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: grab;
		box-shadow: none;
	}

	.figure-minimap:active {
		cursor: grabbing;
	}

	/* Canvas = max zoom-out world; image fixed; view outline moves/resizes. */
	.figure-minimap-canvas {
		position: relative;
		display: block;
		width: 5.5rem;
		aspect-ratio: 16 / 10;
		overflow: hidden;
		/* Follow the sheet corner on the bottom-left; keep other corners tight. */
		border-radius: 0.45rem;
		border-bottom-left-radius: calc(1.75rem - var(--figure-chrome-inset));
		background: color-mix(in srgb, var(--color-text) 28%, var(--color-bg));
	}

	.figure-minimap-image {
		position: absolute;
		box-sizing: border-box;
		border-radius: 0.12rem;
		background: #111;
		pointer-events: none;
	}

	.figure-minimap-view {
		position: absolute;
		box-sizing: border-box;
		border: 1.5px solid #fff;
		border-radius: 0.15rem;
		background: rgb(255 255 255 / 0.12);
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25);
		pointer-events: none;
	}

	.figure-zoom {
		position: absolute;
		z-index: 5;
		right: var(--figure-chrome-inset);
		bottom: var(--figure-chrome-inset);
		display: flex;
		gap: 0.45rem;
		pointer-events: none;
	}

	.figure-scroll {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: auto;
		overscroll-behavior: contain;
		border-radius: inherit;
		-webkit-overflow-scrolling: touch;
		container-type: size;
		cursor: grab;
		touch-action: none;
		user-select: none;
		scrollbar-width: none;
	}

	.figure-fill.morphing .figure-scroll {
		opacity: 0;
		pointer-events: none;
	}

	/* Hide the case thumb while its shared-element flight / viewer is open. */
	.case-ph.is-figure-open,
	.case-ph.is-figure-open img {
		opacity: 0 !important;
	}

	.figure-scroll::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	.figure-scroll.is-panning {
		cursor: grabbing;
	}

	/* Beat base `.scroll-rail { top/bottom }` so X stays on the bottom edge. */
	.figure-fill .figure-scroll-rail-y {
		top: 52px;
		right: 12px;
		bottom: 52px;
		left: auto;
		width: 4px;
		height: auto;
		z-index: 4;
	}

	.figure-fill .figure-scroll-rail-x {
		/* Clear zoom (+/−) on the right; widen left clearance when minimap is present. */
		--figure-scroll-x-gap: 0.75rem;
		--figure-scroll-x-zoom: calc(2.5rem + 0.45rem + 2.5rem);
		top: auto;
		right: calc(var(--figure-chrome-inset) + var(--figure-scroll-x-zoom) + var(--figure-scroll-x-gap));
		bottom: 12px;
		left: calc(var(--figure-chrome-inset) + var(--figure-scroll-x-gap));
		width: auto;
		height: 4px;
		z-index: 4;
	}

	.figure-fill .figure-scroll-rail-x.has-minimap {
		left: calc(var(--figure-chrome-inset) + 5.5rem + var(--figure-scroll-x-gap));
	}

	.figure-fill .figure-scroll-thumb-x {
		top: 0;
		left: 0;
		width: 36px;
		height: 4px;
	}

	/* Mid grey + transparency reads on both light and dark image areas. */
	.figure-fill .scroll-thumb {
		background: rgb(120 120 120 / 0.45);
		box-shadow: 0 0 0 1px rgb(255 255 255 / 0.18);
	}

	.figure-fill .scroll-thumb:hover,
	.figure-fill .scroll-thumb.dragging {
		background: rgb(120 120 120 / 0.65);
		box-shadow: 0 0 0 1px rgb(255 255 255 / 0.28);
	}

	/*
	 * Content-box so canvas padding expands the panable world (zoom-out-past-fit).
	 * Avoid flex-centering — it fights pinch-zoom anchoring.
	 */
	.figure-page {
		box-sizing: content-box;
		width: max-content;
		height: max-content;
	}

	.figure-fill .case-ph.figure-image {
		width: calc((100cqw - 40px) * var(--figure-zoom, 1));
		aspect-ratio: 16 / 10;
		border-radius: 8px;
	}

	.figure-image {
		display: block;
		/* Zoom 1 = viewport minus 20px inset on each side. */
		width: calc((100cqw - 40px) * var(--figure-zoom, 1));
		max-width: none;
		height: auto;
		border-radius: 8px;
		background: transparent;
		pointer-events: none;
		user-select: none;
	}

	.card.figure-filled .scroller {
		pointer-events: none;
	}

	.scroller {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
		/* contain: keep rubber-band at the ends without chaining to the page behind. */
		overscroll-behavior-y: contain;
		outline: none;
	}

	.card.expanded:not(.morphing):not(.closing) .scroller {
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overflow-anchor: none;
		touch-action: pan-y;
		/* Native bars are overlay/hidden on macOS — we draw our own. */
		scrollbar-width: none;
		/* Bleed for magnet tilt: padding + negative margin cancel so layout width is unchanged. */
		padding-inline: 12px;
		margin-inline: -12px;
	}

	.card.expanded:not(.morphing):not(.closing) .scroller::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	.scroll-rail {
		position: absolute;
		top: 28px;
		right: 12px;
		bottom: 28px;
		z-index: 9;
		width: 4px;
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
		width: 4px;
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

	.card.closing .scroll-rail {
		opacity: 0 !important;
		pointer-events: none !important;
	}

	/* Hero block — one viewport tall, then scrolls away with the case study. */
	.stage {
		position: relative;
		z-index: 0;
		height: 100%;
		flex-shrink: 0;
		overflow: hidden;
		background: #111;
		color: #fff;
	}

	.card.closing .details,
	.card.closing .caption,
	.card.closing .dismiss-ring,
	.card.closing .close-hint {
		opacity: 0 !important;
		pointer-events: none !important;
		visibility: hidden;
	}

	.close-hint {
		position: absolute;
		top: 1.75rem;
		left: calc(1.75rem + 22px);
		z-index: 9;
		margin: 0;
		padding: 0;
		width: max-content;
		max-width: calc(100% - 1.75rem - 2.5rem);
		transform-origin: left center;
		transform: translateY(-50%) translateX(-10px) scale(0.64);
		font-size: 13px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		letter-spacing: 0.01em;
		color: rgb(255 255 255 / 0.6);
		text-align: left;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 280ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.close-hint.visible {
		opacity: 1;
		transform: translateY(-50%) translateX(0) scale(1);
		color: transparent;
		background-image: linear-gradient(
			100deg,
			rgb(255 255 255 / 0.6) 0%,
			rgb(255 255 255 / 0.6) 40%,
			rgb(255 255 255 / 1) 50%,
			rgb(255 255 255 / 0.6) 60%,
			rgb(255 255 255 / 0.6) 100%
		);
		background-size: 220% 100%;
		background-position: 100% center;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: close-hint-shimmer 3s ease-in-out infinite;
	}

	.close-hint kbd {
		font: inherit;
		font-weight: inherit;
		color: #fff;
		-webkit-text-fill-color: #fff;
	}

	@keyframes close-hint-shimmer {
		0%,
		25% {
			background-position: 100% center;
		}
		70%,
		100% {
			background-position: 0% center;
		}
	}

	.hero {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background-color: #111;
		background-size: cover;
		background-position: center;
	}

	.hero-cover {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		pointer-events: none;
		opacity: 0;
	}

	.hero-video-mount {
		position: absolute;
		inset: 0;
		opacity: 0;
	}

	.hero-video-mount.ready {
		opacity: 1;
	}

	.hero-video-mount :global(.hero-video) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		pointer-events: none;
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	/*
	 * During open/close layout animation the video layer often paints black.
	 * Show the live canvas cover for the morph only; poster sits underneath.
	 */
	.card.morphing .hero-video-mount {
		opacity: 0 !important;
	}

	.card.morphing .hero-cover {
		opacity: 1;
	}

	.caption {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 2;
		padding: clamp(5rem, 18vh, 9rem) 0 clamp(2rem, 5vw, 3.25rem);
		background: linear-gradient(
			to top,
			rgb(0 0 0 / 0.72) 0%,
			rgb(0 0 0 / 0.28) 55%,
			rgb(0 0 0 / 0) 100%
		);
		opacity: 0;
		transform: translateY(0.75rem);
		pointer-events: none;
		transition:
			opacity var(--motion-content, 220ms) var(--motion-ease, ease),
			transform var(--motion-content, 220ms) var(--motion-ease, ease);
	}

	/* Fade caption as the dismiss ring takes over — hero stays put underneath. */
	.card.content.dismissing .caption {
		opacity: calc(1 - var(--ring-progress, 0));
		transition: none;
	}

	.caption-inner {
		width: var(--project-copy-width);
		max-width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.card.content .caption {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}

	.caption h2 {
		margin: 0 0 0.55rem;
		font-size: clamp(1.35rem, 2.6vw, 1.75rem);
		font-weight: var(--font-weight);
		line-height: 1.15;
		color: #fff;
	}

	.caption p {
		margin: 0;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.55;
		color: rgb(255 255 255 / 0.55);
	}

	.details {
		position: relative;
		z-index: 1;
		overflow: visible;
		container-type: inline-size;
		background: var(--color-bg);
		color: var(--color-text);
		opacity: 0;
		transform: translateY(1rem);
		pointer-events: none;
		transition:
			opacity var(--motion-content, 220ms) var(--motion-ease, ease),
			transform var(--motion-content, 220ms) var(--motion-ease, ease);
	}

	.card.content .details {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}

	.details-inner {
		width: var(--project-copy-width);
		max-width: 100%;
		margin: 0 auto;
		padding: clamp(2rem, 5vw, 3.25rem) 0 clamp(3.5rem, 8vw, 5.5rem);
		box-sizing: border-box;
		overflow: visible;
	}

	.details.coming-soon .details-inner {
		padding-bottom: clamp(2.5rem, 6vw, 4rem);
	}

	.coming-soon-panel {
		margin: 0 0 2.25rem;
	}

	.coming-soon-title {
		margin: 0 0 0.65rem;
		font-size: clamp(1.15rem, 2vw, 1.35rem);
		font-weight: var(--font-weight);
		line-height: 1.25;
		color: var(--color-text);
	}

	.coming-soon-copy {
		margin: 0;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.55;
		color: var(--color-body);
		max-width: 34rem;
	}

	@media (max-width: 800px) {
		.caption-inner,
		.details-inner {
			width: auto;
			margin-inline: var(--page-pad);
		}

		.case-figures.count-2,
		.case-figures.count-3 {
			grid-template-columns: minmax(0, 1fr);
			gap: 2.5rem;
		}
	}

	.details-inner > p,
	.case-copy {
		margin: 0 0 0.95rem;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.55;
		color: var(--color-body);
	}

	.case-copy:last-of-type {
		margin-bottom: 0;
	}

	.case-heading {
		margin: 2.5rem 0 0.85rem;
		font-size: clamp(1.15rem, 2vw, 1.35rem);
		font-weight: var(--font-weight);
		line-height: 1.25;
		color: var(--color-text);
	}

	.case-heading:first-child,
	.meta + .case-heading {
		margin-top: 0;
	}

	.case-logos {
		margin: 1.5rem 0 0;
		max-width: var(--span-4);
	}

	.case-logos + .case-heading {
		margin-top: 2.75rem;
	}

	.case-qa {
		margin: 0 0 2.15rem;
	}

	.case-qa:last-child {
		margin-bottom: 0;
	}

	.case-q {
		margin: 0 0 0.7rem;
		font-size: clamp(1.05rem, 1.8vw, 1.2rem);
		font-weight: var(--font-weight);
		line-height: 1.35;
		color: var(--color-text);
	}

	.meta + .case-qa .case-q {
		margin-top: 0;
	}

	.case-qa .case-copy:last-child {
		margin-bottom: 0;
	}

	.case-figure {
		width: 100%;
		max-width: var(--span-4);
		/* Equal air above the image and below the label. */
		margin: 2.5rem 0;
		padding: 0;
		overflow: visible;
		/* Avoid content-visibility — it paint-contains and clips the magnet tilt. */
		transition: opacity 220ms ease;
	}

	/* Homepage showcase-style focus: dim siblings while an openable figure is hot. */
	.details-inner:has(.case-figure:has(button.case-ph):hover) .case-figure:not(:hover),
	.details-inner:has(.case-figure:has(button.case-ph):hover) .case-phones,
	.details-inner:has(.case-phones:has(button):hover) .case-figure,
	.details-inner:has(.case-phones:has(button):hover) .case-phones:not(:hover) {
		opacity: 0.28;
	}

	.case-phones {
		margin: 2.5rem 0;
		transition: opacity 220ms ease;
	}

	.case-phones + .case-phones {
		margin-top: 0.75rem;
	}

	.case-ph {
		display: block;
		width: 100%;
		max-width: var(--span-4);
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
		overflow: hidden;
	}

	.case-ph.has-image {
		background: color-mix(in srgb, var(--color-text) 6%, var(--color-bg));
	}

	.case-ph img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
	}

	.case-ph.framed {
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
	}

	.case-ph.framed:not(.peek),
	.case-ph.has-backdrop:not(.peek) {
		padding: 20px;
		box-sizing: border-box;
	}

	.case-ph.framed:not(.peek) img,
	.case-ph.has-backdrop:not(.peek) img {
		object-fit: contain;
		object-position: center;
		border-radius: 4px;
	}

	/* Tight chrome — image spans the full inner width; radius follows the outer frame. */
	.case-figure .case-ph.framed.fill:not(.peek) {
		--figure-frame-pad: 8px;
		aspect-ratio: auto;
		display: block;
		padding: var(--figure-frame-pad);
	}

	.case-ph.framed.fill:not(.peek) img {
		position: static;
		display: block;
		width: 100%;
		height: auto;
		max-width: none;
		max-height: none;
		border-radius: calc(0.75rem - var(--figure-frame-pad));
	}

	/* Centered inset — hug the scaled image instead of a tall empty frame. */
	.case-figure .case-ph.framed.scaled:not(.peek) {
		aspect-ratio: auto;
		display: grid;
		place-items: center;
	}

	.case-ph.framed.scaled:not(.peek) img {
		width: calc(100% * var(--figure-scale, 0.5));
		height: auto;
		max-height: none;
		object-fit: contain;
	}

	/* Live component demos sit in the same framed stage as static figures. */
	.case-embed .embed-stage {
		aspect-ratio: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 20px;
		cursor: default;
	}

	.case-embed .embed-stage :global(.menu-demo) {
		margin-inline: auto;
		flex-shrink: 0;
	}

	.case-embed.is-diagram .embed-stage {
		display: block;
		padding: 1.15rem 1rem 1.05rem;
	}

	button.case-ph {
		appearance: none;
		margin: 0;
		padding: 0;
		border: 0;
		font: inherit;
		color: inherit;
		cursor: zoom-in;
		transition:
			transform 180ms ease,
			filter 180ms ease;
	}

	button.case-ph:hover:not(.has-image) {
		filter: brightness(0.97);
	}

	button.case-ph.has-image:hover img {
		opacity: 0.96;
	}

	button.case-ph:focus-visible {
		outline: 2px solid var(--color-accent, #1a73e8);
		outline-offset: 3px;
	}

	.case-figure.ratio-ultrawide .case-ph {
		aspect-ratio: 21 / 9;
	}

	.case-figure.ratio-strip .case-ph {
		/* Height comes from the bar image + padding (see peek override). */
		aspect-ratio: auto;
	}

	.case-figure.ratio-wide .case-ph {
		aspect-ratio: 16 / 10;
	}

	.case-figure.ratio-square .case-ph {
		aspect-ratio: 1 / 1;
	}

	.case-figure.ratio-tall .case-ph {
		aspect-ratio: 4 / 5;
	}

	/* Start a bit cropped, then grow to reveal more of the shot. */
	.case-figure.expandable .case-ph {
		aspect-ratio: 1.72 / 1;
		transition: aspect-ratio 1100ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.case-figure.expandable.expanded .case-ph {
		aspect-ratio: 1.42 / 1;
	}

	.case-figure.expandable:not(.peek):not(.expanded) .case-ph.framed img,
	.case-figure.expandable:not(.peek):not(.expanded) .case-ph.has-backdrop img {
		object-fit: cover;
		object-position: top center;
	}

	/* Full-res peek — pad top/left, clip bottom/right; image wider than the 4-col frame. */
	.case-ph.peek {
		padding: 1rem 0 0 1rem;
		overflow: hidden;
		box-sizing: border-box;
	}

	.case-ph.peek img {
		width: calc(var(--span-4) * 1.55);
		max-width: none;
		height: auto;
		object-fit: cover;
		object-position: top left;
		border-radius: 4px 0 0 0;
		flex-shrink: 0;
	}

	/* Panoramic figures — harder crop, anchored bottom-left. */
	.case-figure.ratio-ultrawide .case-ph.peek {
		position: relative;
		padding: 0 0 1rem 1rem;
	}

	.case-figure.ratio-ultrawide .case-ph.peek img {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		width: calc(var(--span-4) * 3.25);
		height: auto;
		object-position: left bottom;
		border-radius: 0 0 0 4px;
	}

	/* Thin chrome bars — 20px inset, scaled past the frame so the right edge crops. */
	.case-figure.ratio-strip .case-ph.peek {
		padding: 20px 0 20px 20px;
		overflow: hidden;
	}

	.case-figure.ratio-strip .case-ph.peek img {
		position: static;
		display: block;
		width: calc(var(--span-4) * 2.1);
		height: auto;
		max-width: none;
		object-fit: cover;
		object-position: left center;
		border-radius: 4px 0 0 4px;
	}

	.case-figure figcaption {
		margin: 0.55rem 0 0;
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	.case-figures {
		display: grid;
		grid-template-columns: minmax(0, var(--span-4));
		justify-content: start;
		gap: 2.5rem;
		width: 100%;
		max-width: var(--span-4);
		margin: 2.5rem 0;
		overflow: visible;
	}

	.case-figures.count-2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.case-figures.count-3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.case-figures .case-figure {
		width: 100%;
		max-width: none;
		margin: 0;
	}

	.case-figures .case-figure figcaption {
		font-size: 0.8rem;
	}

	.highlights {
		margin-top: 2rem;
	}

	.highlights + .highlights {
		margin-top: 1.5rem;
	}

	.highlights h3 {
		margin: 0 0 0.75rem;
		font-size: 0.92rem;
		font-weight: var(--font-weight);
	}

	.highlights ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.55rem;
	}

	.highlights li {
		padding: 0.85rem 1rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
		font-size: 0.95rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.meta {
		display: grid;
		gap: 0.55rem;
		margin: 0 0 2.75rem;
	}

	.meta div {
		display: grid;
		grid-template-columns: 6.5rem minmax(0, 1fr);
		gap: 0.75rem 1.25rem;
		align-items: baseline;
	}

	.details.coming-soon .meta {
		margin-bottom: 2rem;
	}

	dt {
		margin: 0;
		font-weight: var(--font-weight);
		font-size: 0.95rem;
	}

	dd {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-muted);
	}

	dd a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.dismiss-ring {
		--ring-len: 94.248;
		position: absolute;
		top: calc(1.75rem - 18px);
		left: calc(1.75rem - 18px);
		z-index: 8;
		width: 36px;
		height: 36px;
		opacity: 0;
		transform: scale(0.72);
		transform-origin: center;
		pointer-events: none;
		transition:
			opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.card.figure-filled > .dismiss-ring,
	.card.figure-filled > .close-hint {
		visibility: hidden;
	}

	.dismiss-ring.active {
		opacity: clamp(0.35, calc(var(--ring-progress, 0) * 2.2), 1);
		transform: scale(1);
	}

	.dismiss-ring svg {
		display: block;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.ring-track,
	.ring-progress {
		fill: none;
		stroke-width: 1.75;
	}

	.ring-track {
		stroke: rgb(255 255 255 / 0.35);
	}

	.ring-progress {
		stroke: #fff;
		stroke-linecap: round;
		stroke-dasharray: var(--ring-len);
		stroke-dashoffset: calc(var(--ring-len) * (1 - var(--ring-progress, 0)));
	}

	@media (prefers-reduced-motion: reduce) {
		.backdrop,
		.card,
		.caption,
		.details,
		.dismiss-ring,
		.close-hint,
		.figure-fill {
			transition: none !important;
			animation: none !important;
		}

		.close-hint.visible {
			color: rgb(255 255 255 / 0.6);
			background-image: none;
			-webkit-text-fill-color: unset;
		}

		.hero-video-mount {
			opacity: 1;
		}
	}
</style>
