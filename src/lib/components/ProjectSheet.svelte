<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { getWorkProject } from '$lib/data';
	import {
		activeMotionPresetId,
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

	let id = $state<string | null>(null);
	let origin = $state<ProjectOrigin | null>(null);
	let rendered = $state(false);
	let phase = $state<SheetPhase>('opening');
	let expanded = $state(false);
	let contentVisible = $state(false);
	let videoReady = $state(false);
	/** True while layout width/height is animating — video often paints black then. */
	let morphing = $state(false);
	let motion = $state<MotionPreset>(getMotionPreset(defaultMotionPresetId));
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
	/** Element that opened the sheet — restore focus on close. */
	let restoreFocusEl: HTMLElement | null = null;

	/** 0–1 ring fill (non-reactive — gesture paints without re-rendering). */
	let ringProgress = 0;
	let rawPull = 0;
	let touchActive = false;
	let touchLastY = 0;
	let pullSamples: { t: number; pull: number }[] = [];
	let gestureVelocity = 0;

	const project = $derived(getWorkProject(id));
	const overlayHeadline = $derived(project?.overlayHeadline ?? project?.title ?? '');
	const isDismissing = $derived(phase === 'dismissing');
	const isClosing = $derived(phase === 'closing');
	const canDismiss = $derived(phase === 'open' || phase === 'dismissing');

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
		const padTop = 40;
		const padBottom = 20;
		return withPxRadius({
			top: padTop,
			left: cssLength('calc(var(--grid-offset) + var(--grid-pad))'),
			width: cssLength('var(--span-8)'),
			height: window.innerHeight - padTop - padBottom,
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

	/** Two-state layout chrome — no scale(). */
	function applyChrome(
		el: HTMLElement,
		rect: Rect,
		animate: boolean,
		opts?: { duration?: number; ease?: string }
	) {
		const duration = opts?.duration ?? motion.openDuration;
		const ease = opts?.ease ?? motion.openEase;
		const r = withPxRadius(rect);
		el.style.willChange = animate ? 'top, left, width, height, border-radius' : 'auto';
		el.style.transition = animate
			? [
					`top ${duration}ms ${ease}`,
					`left ${duration}ms ${ease}`,
					`width ${duration}ms ${ease}`,
					`height ${duration}ms ${ease}`,
					`border-radius ${duration}ms ${ease}`
				].join(', ')
			: 'none';
		el.style.top = `${r.top}px`;
		el.style.left = `${r.left}px`;
		el.style.width = `${r.width}px`;
		el.style.height = `${r.height}px`;
		el.style.borderRadius = r.radius;
		el.style.transform = 'none';
	}

	function paintRing(progress: number) {
		ringProgress = clamp01(progress);
		backdropEl?.style.setProperty('--dismiss-progress', String(ringProgress * 0.35));
		backdropEl?.style.setProperty('--ring-progress', String(ringProgress));
		cardEl?.style.setProperty('--ring-progress', String(ringProgress));
		ringEl?.classList.toggle('active', ringProgress > 0.001 && canDismiss);
	}

	function atScrollTop() {
		return !scrollerEl || scrollerEl.scrollTop <= 0.5;
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
		if (cardEl && expanded) {
			const open = openRect ?? finalRect();
			applyChrome(cardEl, open, !reduceMotion, {
				duration: Math.min(220, motion.closeDuration),
				ease: motion.closeEase
			});
			sheetH = open.height;
		}
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

	/** Trackpad / wheel: past-top overscroll drives the ring; content scroll is untouched. */
	function onWheel(event: WheelEvent) {
		if (!canDismiss || reduceMotion || closeRequested || phase === 'closing') return;

		// Past the top → fill ring (deltaY < 0).
		if (atScrollTop() && event.deltaY < 0) {
			event.preventDefault();
			if (rawPull >= PULL_RANGE) {
				close();
				return;
			}
			paintDismiss(rawPull + -event.deltaY);
			scheduleSettle();
			return;
		}

		// While armed, scroll-down releases the ring before content moves.
		if (rawPull > 0 && event.deltaY > 0) {
			event.preventDefault();
			const next = rawPull - event.deltaY;
			if (next <= DEAD_ZONE) clearDismiss();
			else paintDismiss(next);
			scheduleSettle();
		}
	}

	function onTouchStart(event: TouchEvent) {
		if (!canDismiss || closeRequested) return;
		touchActive = true;
		touchLastY = event.touches[0]?.clientY ?? 0;
		clearTimeout(settleTimer);
		if (videoEl) void videoEl.play().catch(() => {});
	}

	function onTouchMove(event: TouchEvent) {
		if (!touchActive || !canDismiss || reduceMotion || closeRequested) return;
		const y = event.touches[0]?.clientY ?? touchLastY;
		const dy = y - touchLastY; // >0 finger down → pull to dismiss at top
		touchLastY = y;

		if (atScrollTop() && dy > 0) {
			if (event.cancelable) event.preventDefault();
			if (rawPull >= PULL_RANGE) {
				close();
				return;
			}
			paintDismiss(rawPull + dy);
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

	function onTouchEnd() {
		if (!touchActive) return;
		touchActive = false;
		if (!canDismiss || reduceMotion || closeRequested) return;
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

		phase = 'closing';
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
					ease: motion.closeEase
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

	function close() {
		if (phase === 'closing' || closeRequested) return;
		closeRequested = true;
		rawPull = Math.min(rawPull, PULL_RANGE);

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

	function finishClose(epoch = closeEpoch) {
		if (epoch !== closeEpoch) return;

		cancelAnimationFrame(closeFrame);
		stopCoverPaint();
		// Return the borrowed video to the card BEFORE unlifting / unmounting.
		returnVideo();
		videoEl = undefined;
		rendered = false;
		expanded = false;
		contentVisible = false;
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
		if (event.target === event.currentTarget && canDismiss) close();
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

		if (event.key === 'Escape' && canDismiss) {
			close();
			return;
		}

		if (!canDismiss || !scrollerEl || morphing || closeRequested) return;
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
		if (!canDismiss || !cardEl || !expanded) return;
		openRect = finalRect();
		sheetH = openRect.height;
		applyChrome(cardEl, openRect, false);
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
		const unsubMotion = activeMotionPresetId.subscribe((value) => {
			motion = getMotionPreset(value);
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
			if (scrollerEl) scrollerEl.scrollTop = 0;
			focusScroller();
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
		if (!browser || !expanded || !canDismiss || !scrollerEl || reduceMotion) return;

		const scroller = scrollerEl;
		const passive: AddEventListenerOptions = { passive: true };
		const wheelOpts: AddEventListenerOptions = { passive: false };
		const touchMoveOpts: AddEventListenerOptions = { passive: false };

		scroller.addEventListener('wheel', onWheel, wheelOpts);
		scroller.addEventListener('touchstart', onTouchStart, passive);
		scroller.addEventListener('touchmove', onTouchMove, touchMoveOpts);
		scroller.addEventListener('touchend', onTouchEnd, passive);
		scroller.addEventListener('touchcancel', onTouchEnd, passive);

		return () => {
			scroller.removeEventListener('wheel', onWheel, wheelOpts);
			scroller.removeEventListener('touchstart', onTouchStart, passive);
			scroller.removeEventListener('touchmove', onTouchMove, touchMoveOpts);
			scroller.removeEventListener('touchend', onTouchEnd, passive);
			scroller.removeEventListener('touchcancel', onTouchEnd, passive);
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
			role="dialog"
			aria-modal="true"
			aria-labelledby="project-card-title"
			tabindex="-1"
			style:--sheet-h="{sheetH}px"
		>
			<div bind:this={ringEl} class="dismiss-ring" aria-hidden="true">
				<svg viewBox="0 0 24 24">
					<circle class="ring-track" cx="12" cy="12" r="10" />
					<circle class="ring-progress" cx="12" cy="12" r="10" />
				</svg>
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
							<h2 id="project-card-title">{overlayHeadline}</h2>
							<p>{project.description}</p>
						</div>
					</div>
				</section>

				<section class="details">
					<div class="details-inner">
						{#if project.caseStudy?.length}
							{#each project.caseStudy as block, index (`${block.type}-${index}`)}
								{#if block.type === 'heading'}
									<h3 class="case-heading">{block.text}</h3>
								{:else if block.type === 'paragraph'}
									<p class="case-copy">{block.text}</p>
								{:else if block.type === 'figure'}
									<figure class="case-figure ratio-{block.ratio ?? 'wide'}">
										<div class="case-ph" aria-hidden="true"></div>
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
											<figure class="case-figure ratio-{block.ratio ?? 'square'}">
												<div class="case-ph" aria-hidden="true"></div>
												{#if block.captions?.[figIndex]}
													<figcaption>{block.captions[figIndex]}</figcaption>
												{/if}
											</figure>
										{/each}
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

						<dl class="meta">
							{#if project.role}
								<div>
									<dt>Role</dt>
									<dd>{project.role}</dd>
								</div>
							{/if}
							<div>
								<dt>Services</dt>
								<dd>{project.services}</dd>
							</div>
							<div>
								<dt>Year</dt>
								<dd>{project.year}</dd>
							</div>
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
					</div>
				</section>
			</div>
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

	.scroller {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
		overscroll-behavior-y: none;
		outline: none;
	}

	.card.expanded:not(.morphing):not(.closing) .scroller {
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overflow-anchor: none;
		touch-action: pan-y;
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
	.card.closing .dismiss-ring {
		opacity: 0 !important;
		pointer-events: none !important;
		visibility: hidden;
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
		font-size: clamp(0.95rem, 1.5vw, 1.05rem);
		line-height: 1.5;
		color: rgb(255 255 255 / 0.88);
	}

	.details {
		position: relative;
		z-index: 1;
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
	}

	@media (max-width: 800px) {
		.caption-inner,
		.details-inner {
			width: auto;
			margin-inline: var(--page-pad);
		}
	}

	.details-inner > p,
	.case-copy {
		margin: 0 0 0.95rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.case-heading {
		margin: 2.5rem 0 0.85rem;
		font-size: clamp(1.15rem, 2vw, 1.35rem);
		font-weight: var(--font-weight);
		line-height: 1.25;
		color: var(--color-text);
	}

	.case-heading:first-child {
		margin-top: 0;
	}

	.case-figure {
		margin: 1.5rem 0 0.35rem;
		padding: 0;
		content-visibility: auto;
		contain-intrinsic-size: auto 16rem;
	}

	.case-ph {
		display: block;
		width: 100%;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
	}

	.case-figure.ratio-ultrawide .case-ph {
		aspect-ratio: 21 / 9;
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

	.case-figure figcaption {
		margin: 0.55rem 0 0;
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	.case-figures {
		display: grid;
		gap: 0.85rem;
		margin: 1.5rem 0 0.35rem;
	}

	.case-figures.count-2 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.case-figures.count-3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.case-figures .case-figure {
		margin: 0;
	}

	@media (max-width: 800px) {
		.case-figures.count-3 {
			grid-template-columns: 1fr;
		}
	}

	.highlights {
		margin-top: 2rem;
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
		margin: 1.75rem 0 0;
	}

	.meta div {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		gap: 0.75rem;
		align-items: baseline;
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
		--ring-len: 62.832;
		position: absolute;
		top: 44px;
		left: 50%;
		z-index: 8;
		width: 24px;
		height: 24px;
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.72);
		pointer-events: none;
		transition:
			opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.dismiss-ring.active {
		opacity: clamp(0.35, calc(var(--ring-progress, 0) * 2.2), 1);
		transform: translate(-50%, -50%) scale(1);
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
		stroke-width: 3;
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
		.dismiss-ring {
			transition: none !important;
		}

		.hero-video-mount {
			opacity: 1;
		}
	}
</style>
