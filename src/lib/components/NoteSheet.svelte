<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import NoteDiagram from '$lib/components/NoteDiagram.svelte';
	import { getNote } from '$lib/data';
	import { parseNoteInline } from '$lib/noteInline';
	import {
		activeMotion,
		defaultCloseEaseId,
		defaultMotionPresetId,
		getMotionPreset,
		type MotionPreset
	} from '$lib/projectMotion';
	import {
		clearNote,
		hydrateNoteFromUrl,
		noteIdFromPage,
		noteIdFromUrl,
		noteOrigin,
		openNote,
		openNoteId,
		shouldHydrateNoteFromUrl,
		syncNoteUrlAfterClose,
		waitForNoteSource,
		type NoteOrigin
	} from '$lib/noteSheet';

	type Rect = {
		top: number;
		left: number;
		width: number;
		height: number;
		radius: string;
	};

	type SheetPhase = 'opening' | 'open' | 'dismissing' | 'closing';

	let id = $state<string | null>(null);
	let origin = $state<NoteOrigin | null>(null);
	let rendered = $state(false);
	let phase = $state<SheetPhase>('opening');
	let expanded = $state(false);
	let contentVisible = $state(false);
	let morphing = $state(false);
	let motion = $state<MotionPreset>(getMotionPreset(defaultMotionPresetId, defaultCloseEaseId));

	/** Rise and settle — long ease-out, for a card coming up from below. */
	const NOTE_OPEN_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
	/** Fall away — ease-in, so it commits downward instead of slowing at the fold. */
	const NOTE_CLOSE_EASE = 'cubic-bezier(0.42, 0, 1, 1)';
	let sheetH = $state(0);

	let backdropEl: HTMLDivElement | undefined = $state();
	let cardEl: HTMLDivElement | undefined = $state();
	let scrollerEl: HTMLDivElement | undefined = $state();
	let ringEl: HTMLDivElement | undefined = $state();

	let openRect: Rect | null = null;
	let openFrame = 0;
	let closeFrame = 0;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let contentTimer: ReturnType<typeof setTimeout> | undefined;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	let closeEpoch = 0;
	let pendingHistoryPop = false;
	let closeRequested = false;
	let escapeScrollPending = false;
	let escapeScrollTimer: ReturnType<typeof setTimeout> | undefined;
	let escapeScrollCleanup: (() => void) | undefined;
	let pageScrollLockTimer: ReturnType<typeof setTimeout> | undefined;
	let pageScrollLockCleanup: (() => void) | undefined;
	let restoreFocusEl: HTMLElement | null = null;
	let hintVisible = $state(false);
	let scrollThumb = $state({ top: 0, height: 0, visible: false });
	let thumbDragging = $state(false);

	let ringProgress = 0;
	let rawPull = 0;
	let touchActive = false;
	let touchLastY = 0;
	let pullSamples: { t: number; pull: number }[] = [];
	let gestureVelocity = 0;

	const note = $derived(getNote(id));
	const isDismissing = $derived(phase === 'dismissing');
	const isClosing = $derived(phase === 'closing');
	const canDismiss = $derived(phase === 'open' || phase === 'dismissing');

	const PULL_RANGE = 280;
	const DISMISS_PREVIEW = 0.1;
	const FLICK_VELOCITY = 0.7;
	const DEAD_ZONE = 8;
	const VELOCITY_WINDOW_MS = 100;
	const COAST_MS = 180;
	const SCROLL_SETTLE_MS = 120;
	const SCROLL_TRACK_PAD = 28;
	const SCROLL_THUMB_MIN = 36;

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
		const first = value.trim().split(/\s+/)[0] || '0.75rem';
		if (first.endsWith('px')) return parseFloat(first) || 0;
		try {
			return cssLength(first);
		} catch {
			return cssLength('0.75rem');
		}
	}

	function withPxRadius(rect: Rect): Rect {
		return { ...rect, radius: `${radiusPx(rect.radius)}px` };
	}

	function finalRect(): Rect {
		const pagePad = cssLength('var(--page-pad)');
		const padY = Math.round(Math.min(72, Math.max(44, pagePad * 1.05)));
		const padX = Math.round(Math.min(56, Math.max(28, pagePad * 0.75)));
		return withPxRadius({
			top: padY,
			left: cssLength(`calc(var(--grid-offset) + var(--grid-pad) + ${padX}px)`),
			width: cssLength(`calc(var(--span-8) - ${padX * 2}px)`),
			height: window.innerHeight - padY * 2,
			radius: '1.75rem'
		});
	}

	function dockRect(): Rect {
		const open = openRect ?? finalRect();
		const width = open.width * 0.84;
		const height = open.height * 0.84;
		return withPxRadius({
			top: window.innerHeight + 28,
			left: open.left + (open.width - width) / 2,
			width,
			height,
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

	function applyChrome(
		el: HTMLElement,
		rect: Rect,
		animate: boolean,
		opts?: { duration?: number; ease?: string }
	) {
		const duration = opts?.duration ?? motion.openDuration;
		const ease = opts?.ease ?? NOTE_OPEN_EASE;
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
				/* cancelled */
			});
	}

	function paintDismissPreview(progress: number) {
		if (!cardEl || !expanded || phase === 'closing') return;
		const open = openRect ?? finalRect();
		const dock = dockRect();
		const t = clamp01(progress) * DISMISS_PREVIEW;
		applyChrome(cardEl, lerpRect(open, dock, t), false);
		sheetH = lerpRect(open, dock, t).height;
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

	function clearDismiss() {
		rawPull = 0;
		clearPullSamples();
		paintRing(0);
		if (phase === 'dismissing') phase = 'open';
		if (contentVisible && !closeRequested) hintVisible = true;
		if (cardEl && expanded) {
			const open = openRect ?? finalRect();
			applyChrome(cardEl, open, !reduceMotion, {
				duration: Math.min(260, motion.openDuration + 40),
				ease: NOTE_OPEN_EASE
			});
			sheetH = open.height;
		}
		syncTopOverscrollLock();
	}

	function paintDismiss(nextRaw: number) {
		if (!canDismiss || reduceMotion || closeRequested || phase === 'closing') return;
		rawPull = Math.min(PULL_RANGE, Math.max(0, nextRaw));
		notePullSample(rawPull);
		const progress = clamp01(rawPull / PULL_RANGE);
		if (rawPull > DEAD_ZONE && phase === 'open') phase = 'dismissing';
		paintRing(progress);
		paintDismissPreview(progress);
		syncTopOverscrollLock();
		if (rawPull >= PULL_RANGE) close();
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

	function hideCloseHint() {
		if (hintVisible) hintVisible = false;
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
		const top = (trackH - height) * (scrollTop / overflow);
		scrollThumb = { top, height, visible: true };
	}

	function wheelDeltaY(event: WheelEvent) {
		if (event.deltaMode === 1) return event.deltaY * 16;
		if (event.deltaMode === 2) return event.deltaY * (scrollerEl?.clientHeight ?? 800);
		return event.deltaY;
	}

	function onWheel(event: WheelEvent) {
		if (!scrollerEl) return;

		if (closeRequested || phase === 'closing' || morphing) {
			event.preventDefault();
			if (scrollerEl.scrollTop !== 0) scrollerEl.scrollTop = 0;
			return;
		}

		if (!canDismiss) return;

		const deltaY = wheelDeltaY(event);
		const scrollTop = scrollerEl.scrollTop;

		if (deltaY < 0 && scrollTop + deltaY <= 0.5) {
			event.preventDefault();
			if (scrollTop > 0) {
				scrollerEl.scrollTop = 0;
				updateScrollThumb();
			}
			syncTopOverscrollLock();
			if (reduceMotion) return;
			hideCloseHint();
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

		if (!reduceMotion && rawPull > 0 && deltaY > 0) {
			event.preventDefault();
			const next = rawPull - deltaY;
			if (next <= DEAD_ZONE) clearDismiss();
			else paintDismiss(next);
			scheduleSettle();
			return;
		}

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
		if (closeRequested || !canDismiss) return;
		touchActive = true;
		touchLastY = event.touches[0]?.clientY ?? 0;
		clearTimeout(settleTimer);
	}

	function onTouchMove(event: TouchEvent) {
		if (!touchActive || reduceMotion) return;
		if (closeRequested || phase === 'closing') {
			if (event.cancelable) event.preventDefault();
			if (scrollerEl && scrollerEl.scrollTop !== 0) scrollerEl.scrollTop = 0;
			return;
		}
		if (!canDismiss) return;
		const y = event.touches[0]?.clientY ?? touchLastY;
		const dy = y - touchLastY;
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

		if (scrollerEl && dy > 0 && scrollerEl.scrollTop > 0 && scrollerEl.scrollTop < dy + 1) {
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

	function onTouchEnd() {
		if (!touchActive) return;
		touchActive = false;
		if (reduceMotion || closeRequested || !canDismiss) return;
		if (rawPull > DEAD_ZONE) settleDismiss();
		else if (rawPull > 0) clearDismiss();
	}

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

		const from = currentCardRect();
		const to = dockRect();
		phase = 'closing';
		expanded = false;
		morphing = true;
		if (scrollerEl) scrollerEl.scrollTop = 0;
		applyChrome(cardEl, from, false);

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (epoch !== closeEpoch) return;
				if (!cardEl) {
					finishClose(epoch);
					return;
				}
				applyChrome(cardEl, to, true, {
					duration: motion.closeDuration,
					ease: NOTE_CLOSE_EASE
				});
				clearTimeout(closeTimer);
				closeTimer = setTimeout(() => finishClose(epoch), motion.closeDuration);
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
		scroller.scrollTo({ top: from, behavior: 'auto' });

		const finish = () => {
			if (!escapeScrollPending) return;
			clearEscapeScroll();
			scroller.scrollTop = 0;
			close();
		};

		if (from < 120) {
			finish();
			return;
		}

		const duration = Math.min(240, Math.max(motion.closeDuration, 90 + from * 0.08));
		const started = performance.now();
		let frame = 0;

		const tick = (now: number) => {
			if (!escapeScrollPending) return;
			const t = Math.min(1, (now - started) / duration);
			const eased = 1 - (1 - t) ** 3;
			scroller.scrollTop = from * (1 - eased);
			if (t < 1) {
				frame = requestAnimationFrame(tick);
				return;
			}
			finish();
		};

		escapeScrollCleanup = () => cancelAnimationFrame(frame);
		escapeScrollTimer = setTimeout(() => {
			if (!escapeScrollPending) return;
			scroller.scrollTop = 0;
			finish();
		}, duration + 80);
		frame = requestAnimationFrame(tick);
	}

	function close() {
		if (phase === 'closing' || closeRequested) return;
		clearEscapeScroll();
		closeRequested = true;
		rawPull = Math.min(rawPull, PULL_RANGE);
		if (scrollerEl) scrollerEl.scrollTop = 0;

		const epoch = ++closeEpoch;
		pendingHistoryPop =
			Boolean(page.state.noteId) ||
			Boolean(noteIdFromUrl(page.url)) ||
			Boolean(noteIdFromUrl(new URL(location.href)));

		touchActive = false;
		clearPullSamples();
		clearTimeout(settleTimer);

		if (phase === 'opening') {
			beginClose(epoch);
			return;
		}

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
		lockPageScrollBriefly();
		rendered = false;
		expanded = false;
		contentVisible = false;
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
		touchActive = false;
		id = null;
		origin = null;
		closeRequested = false;
		clearEscapeScroll();
		const shouldPop = pendingHistoryPop;
		pendingHistoryPop = false;
		const focusEl = restoreFocusEl;
		restoreFocusEl = null;
		clearNote();
		if (shouldPop) syncNoteUrlAfterClose();
		queueMicrotask(() => focusEl?.focus({ preventScroll: true }));
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target !== event.currentTarget) return;
		if (canDismiss) dismissWithScrollFirst();
	}

	function isTypingTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
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
			if (canDismiss) {
				event.preventDefault();
				dismissWithScrollFirst();
			}
			return;
		}

		if (!canDismiss || !scrollerEl || morphing || closeRequested || escapeScrollPending) return;
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;

		const scroller = scrollerEl;
		const line = Math.max(40, Math.round(scroller.clientHeight * 0.12));
		const pageH = Math.max(line, Math.round(scroller.clientHeight * 0.85));

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
				scrollSheetBy(pageH);
				return;
			case 'PageUp':
				event.preventDefault();
				scrollSheetBy(-pageH);
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
				scrollSheetBy(event.shiftKey ? -pageH : pageH);
				return;
		}
	}

	function onResize() {
		if (!canDismiss || !cardEl || !expanded) return;
		openRect = finalRect();
		sheetH = openRect.height;
		applyChrome(cardEl, openRect, false);
		updateScrollThumb();
	}

	function onThumbPointerDown(event: PointerEvent) {
		if (!scrollerEl) return;
		event.preventDefault();
		thumbDragging = true;
		const rail = (event.currentTarget as HTMLElement).parentElement;
		const startY = event.clientY;
		const startTop = scrollerEl.scrollTop;
		const overflow = scrollerEl.scrollHeight - scrollerEl.clientHeight;
		const trackH = Math.max(0, scrollerEl.clientHeight - SCROLL_TRACK_PAD * 2);
		const thumbH = scrollThumb.height;
		const range = Math.max(1, trackH - thumbH);

		const move = (moveEvent: PointerEvent) => {
			if (!scrollerEl) return;
			scrollerEl.scrollTop = startTop + ((moveEvent.clientY - startY) / range) * overflow;
		};
		const up = () => {
			thumbDragging = false;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		void rail;
	}

	$effect(() => {
		if (!browser) return;

		const stateId = page.state.noteId ?? null;
		const urlId = noteIdFromUrl(page.url) ?? noteIdFromUrl(new URL(location.href));
		const targetId = noteIdFromPage(page);

		if (!stateId && urlId && getNote(urlId) && shouldHydrateNoteFromUrl(urlId)) {
			const controller = new AbortController();
			void waitForNoteSource(urlId, { signal: controller.signal }).then(() => {
				if (controller.signal.aborted) return;
				hydrateNoteFromUrl(urlId);
			});
			return () => controller.abort();
		}

		untrack(() => {
			if (targetId && getNote(targetId)) {
				if (targetId !== id) {
					openNote(targetId, undefined, undefined, { syncUrl: false });
				}
				return;
			}

			if ((rendered || id) && phase !== 'closing') {
				close();
			}
		});
	});

	$effect(() => {
		const unsubMotion = activeMotion.subscribe((value) => {
			motion = value;
		});
		const unsubId = openNoteId.subscribe((value) => {
			clearTimeout(closeTimer);
			clearTimeout(contentTimer);
			clearTimeout(settleTimer);
			cancelAnimationFrame(openFrame);
			cancelAnimationFrame(closeFrame);

			if (value) {
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
				contentVisible = false;
				id = value;
				rendered = true;
				expanded = false;
			}
		});
		const unsubOrigin = noteOrigin.subscribe((value) => {
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
		};
	});

	$effect(() => {
		if (!browser || !rendered || !cardEl || !note) return;

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
		const from = dockRect();

		const revealContent = () => {
			if (phase !== 'open') return;
			contentVisible = true;
			hintVisible = true;
			if (scrollerEl) scrollerEl.scrollTop = 0;
			focusScroller();
			requestAnimationFrame(updateScrollThumb);
		};

		if (reduceMotion) {
			applyChrome(cardEl, target, false);
			expanded = true;
			phase = 'open';
			morphing = false;
			revealContent();
		} else {
			applyChrome(cardEl, from, false);
			openFrame = requestAnimationFrame(() => {
				openFrame = requestAnimationFrame(() => {
					if (!cardEl || phase === 'closing') return;
					applyChrome(cardEl, target, true, {
						duration: motion.openDuration,
						ease: NOTE_OPEN_EASE
					});
					expanded = true;
					phase = 'open';
					if (scrollerEl) scrollerEl.scrollTop = 0;
					clearTimeout(contentTimer);
					contentTimer = setTimeout(() => {
						morphing = false;
						revealContent();
					}, motion.openDuration);
				});
			});
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		if (!browser || !expanded || !canDismiss || !scrollerEl) return;
		const scroller = scrollerEl;
		const passive: AddEventListenerOptions = { passive: true };
		const onScroll = () => {
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
				hintVisible = true;
			}
		};
		scroller.addEventListener('scroll', onScroll, passive);
		syncTopOverscrollLock();
		updateScrollThumb();
		const ro =
			typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateScrollThumb()) : null;
		ro?.observe(scroller);
		return () => {
			scroller.removeEventListener('scroll', onScroll, passive);
			ro?.disconnect();
		};
	});

	$effect(() => {
		if (!browser || !scrollerEl || !rendered) return;
		if (phase !== 'closing' && (!expanded || !canDismiss)) return;

		const scroller = scrollerEl;
		const passive: AddEventListenerOptions = { passive: true };
		const wheelOpts: AddEventListenerOptions = { passive: false, capture: true };
		const touchMoveOpts: AddEventListenerOptions = { passive: false };
		const lockScroll = () => {
			if ((closeRequested || phase === 'closing') && scroller.scrollTop !== 0) {
				scroller.scrollTop = 0;
			}
		};

		window.addEventListener('wheel', onWheel, wheelOpts);
		scroller.addEventListener('scroll', lockScroll, passive);
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

{#if rendered && note}
	<div
		bind:this={backdropEl}
		class="backdrop"
		class:expanded
		role="presentation"
		style:--motion-backdrop="{expanded ? motion.backdropMs : motion.closeBackdropMs}ms"
		style:--motion-content="{contentVisible ? motion.contentMs : motion.closeContentMs}ms"
		style:--motion-ease={expanded ? NOTE_OPEN_EASE : NOTE_CLOSE_EASE}
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
			aria-labelledby="note-card-title"
			tabindex="-1"
			style:--sheet-h="{sheetH}px"
		>
			<button
				type="button"
				class="sheet-close"
				class:visible={contentVisible && canDismiss && !morphing}
				tabindex={contentVisible && canDismiss && !morphing ? 0 : -1}
				aria-label="Close"
				onclick={() => dismissWithScrollFirst()}
			>
				<svg viewBox="0 0 8 8" aria-hidden="true">
					<path
						d="M1.5 1.5l5 5M6.5 1.5l-5 5"
						fill="none"
						stroke="currentColor"
						stroke-width="1.2"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			<p
				class="close-hint"
				class:visible={hintVisible && contentVisible && canDismiss}
				aria-hidden={!(hintVisible && contentVisible && canDismiss)}
			>
				Scroll up or press <kbd>esc</kbd> to close
			</p>

			<div bind:this={ringEl} class="dismiss-ring" aria-hidden="true">
				<svg viewBox="0 0 40 40">
					<circle class="ring-track" cx="20" cy="20" r="17" />
					<circle class="ring-progress" cx="20" cy="20" r="17" />
				</svg>
			</div>

			<div
				class="scroll-rail"
				class:visible={scrollThumb.visible && contentVisible && !isClosing && !morphing && !isDismissing}
				aria-hidden="true"
			>
				<button
					type="button"
					class="scroll-thumb"
					class:dragging={thumbDragging}
					tabindex="-1"
					style:transform="translate3d(0, {scrollThumb.top}px, 0)"
					style:height="{scrollThumb.height}px"
					aria-label="Scroll note"
					onpointerdown={onThumbPointerDown}
				></button>
			</div>

			<div class="scroller" bind:this={scrollerEl} tabindex="-1">
				<div class="sheet-flow">
				<div class="details">
					<div class="details-inner">
						{#snippet rich(text: string)}
							{#each parseNoteInline(text) as part, partIndex (`${part.type}-${partIndex}`)}
								{#if part.type === 'text'}{part.text}{:else if part.type === 'em'}<em>{part.text}</em>{:else if part.type === 'ref'}<sup class="ref"><a href="#note-ref-{part.id}">[{part.id}]</a></sup>{:else if part.type === 'link'}<a href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>{/if}
							{/each}
						{/snippet}

						<header class="header">
							<h2 id="note-card-title">{note.title}</h2>
						</header>

						{#each note.body as block, index (`${block.type}-${index}`)}
							{#if block.type === 'heading'}
								<h3 class="heading">{block.text}</h3>
							{:else if block.type === 'paragraph'}
								<p class="copy">{@render rich(block.text)}</p>
							{:else if block.type === 'list'}
								<ol class="steps">
									{#each block.items as item (item)}
										<li>{@render rich(item)}</li>
									{/each}
								</ol>
							{:else if block.type === 'diagram'}
								<figure class="figure">
									<NoteDiagram kind={block.kind} />
								</figure>
							{:else if block.type === 'figure'}
								<figure class="figure ratio-{block.ratio ?? 'wide'}">
									<div class="ph"></div>
									<figcaption>{block.caption}</figcaption>
								</figure>
							{:else if block.type === 'footnotes'}
								<ol class="footnotes">
									{#each block.items as item (item.id)}
										<li id="note-ref-{item.id}">{@render rich(item.text)}</li>
									{/each}
								</ol>
							{/if}
						{/each}
					</div>
				</div>
				</div>
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
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
		color: var(--color-text);
		outline: none;
		transition: background-color var(--motion-backdrop, 320ms) var(--motion-ease, ease);
	}

	.card.expanded:not(.closing) {
		background: var(--color-bg);
	}

	.card.dismissing {
		cursor: grabbing;
	}

	.scroller {
		position: absolute;
		inset: 0;
		z-index: 1;
		overflow: hidden;
		overscroll-behavior-y: contain;
		outline: none;
	}

	.card.expanded:not(.morphing):not(.closing) .scroller {
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overflow-anchor: none;
		touch-action: pan-y;
		scrollbar-width: none;
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
	}

	.scroll-thumb.dragging {
		cursor: grabbing;
	}

	.details {
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

	.card.closing .details,
	.card.closing .dismiss-ring,
	.card.closing .close-hint,
	.card.closing .sheet-close {
		opacity: 0 !important;
		pointer-events: none !important;
		visibility: hidden;
	}

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
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition: opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.sheet-close::before {
		content: '';
		position: absolute;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.05);
		backdrop-filter: blur(40px);
		-webkit-backdrop-filter: blur(40px);
		transition: background-color 140ms ease;
	}

	.sheet-close.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.sheet-close svg {
		position: relative;
		display: block;
		width: 10px;
		height: 10px;
	}

	.sheet-close:hover::before {
		background: rgb(255 255 255 / 0.12);
	}

	.sheet-close:focus-visible {
		outline: none;
	}

	.sheet-close:focus-visible::before {
		outline: 2px solid var(--color-text);
		outline-offset: 2px;
	}

	.details-inner {
		width: var(--project-copy-width);
		max-width: 100%;
		margin: 0 auto;
		padding: clamp(4.5rem, 10vw, 6rem) 0 clamp(3.5rem, 8vw, 5.5rem);
		box-sizing: border-box;
	}

	.header {
		margin: 0 0 2.25rem;
	}

	.header h2 {
		margin: 0;
		font-size: var(--page-title-size);
		font-weight: var(--font-weight);
		line-height: 1.15;
		letter-spacing: -0.03em;
	}

	.heading {
		margin: 2.5rem 0 0.85rem;
		font-size: clamp(1.15rem, 2vw, 1.35rem);
		font-weight: var(--font-weight);
		line-height: 1.25;
	}

	.copy {
		margin: 0 0 0.95rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.copy:last-child {
		margin-bottom: 0;
	}

	.steps {
		margin: 0 0 0.95rem;
		padding: 0 0 0 1.25rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.steps li {
		padding-left: 0.25rem;
	}

	.steps li + li {
		margin-top: 0.35rem;
	}

	.steps:last-child {
		margin-bottom: 0;
	}

	.copy em,
	.steps em,
	.footnotes em {
		font-style: italic;
	}

	.copy a,
	.steps a,
	.footnotes a {
		color: inherit;
	}

	.ref {
		font-size: 0.7em;
		line-height: 0;
	}

	.ref a {
		text-decoration: none;
	}

	.footnotes {
		margin: 2.75rem 0 0;
		padding: 1.25rem 0 0 1.15rem;
		border-top: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.footnotes li + li {
		margin-top: 0.55rem;
	}

	.figure {
		width: 100%;
		margin: 2.25rem 0;
		padding: 0;
	}

	.ph {
		width: 100%;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 10%, var(--color-bg));
	}

	.ratio-wide .ph {
		aspect-ratio: 16 / 10;
	}

	.ratio-square .ph {
		aspect-ratio: 1 / 1;
	}

	.ratio-tall .ph {
		aspect-ratio: 4 / 5;
	}

	.ratio-ultrawide .ph {
		aspect-ratio: 2.4 / 1;
	}

	.ratio-strip .ph {
		aspect-ratio: 4 / 1;
	}

	figcaption {
		margin: 0.55rem 0 0;
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	.sheet-flow {
		position: relative;
		min-height: 100%;
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
		transform: translateY(calc(-50% + 6px));
		font-size: 13px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		letter-spacing: 0.01em;
		color: var(--color-muted);
		text-align: left;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 280ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.close-hint.visible {
		opacity: 1;
		transform: translateY(-50%);
	}

	.close-hint kbd {
		font: inherit;
		font-weight: inherit;
		color: var(--color-text);
	}

	.dismiss-ring {
		--ring-len: 106.814;
		position: absolute;
		top: calc(1.75rem - 20px);
		left: calc(1.75rem - 20px);
		z-index: 8;
		width: 40px;
		height: 40px;
		opacity: 0;
		transform: scale(0.72);
		transform-origin: center;
		pointer-events: none;
		transition:
			opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
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
		stroke: color-mix(in srgb, var(--color-text) 16%, transparent);
	}

	.ring-progress {
		stroke: var(--color-text);
		stroke-linecap: round;
		stroke-dasharray: var(--ring-len);
		stroke-dashoffset: calc(var(--ring-len) * (1 - var(--ring-progress, 0)));
	}

	@media (max-width: 800px) {
		.details-inner {
			width: auto;
			margin-inline: var(--page-pad);
		}
	}
</style>
