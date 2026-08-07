<script lang="ts">
	import { browser } from '$app/environment';
	import { getWorkProject } from '$lib/data';
	import {
		lerpPose,
		poseTransform,
		ZERO_POSE,
		type MagnetPose
	} from '$lib/magnet';
	import {
		activeMotionPresetId,
		defaultMotionPresetId,
		getMotionPreset,
		type MotionPreset
	} from '$lib/projectMotion';
	import {
		closeProject,
		openProjectId,
		projectOrigin,
		type ProjectOrigin
	} from '$lib/projectSheet';
	import { rememberVideoTime, resumeVideo } from '$lib/videoPlayback';

	type Rect = {
		top: number;
		left: number;
		width: number;
		height: number;
		radius: string;
	};

	let id = $state<string | null>(null);
	let origin = $state<ProjectOrigin | null>(null);
	let rendered = $state(false);
	let expanded = $state(false);
	/** Caption overlay — revealed after the thumbnail morph finishes. */
	let contentVisible = $state(false);
	let closing = $state(false);
	let dismissing = $state(false);
	let dismissProgress = $state(0);
	/** 0–1 ring fill toward the snap threshold (completes when dismiss catches). */
	let ringProgress = $state(0);
	let motion = $state<MotionPreset>(getMotionPreset(defaultMotionPresetId));

	let cardEl: HTMLDivElement | undefined = $state();
	let scrollerEl: HTMLDivElement | undefined = $state();
	let videoEl: HTMLVideoElement | undefined = $state();
	let videoReady = $state(false);

	let openRect: Rect | null = null;
	let openFrame = 0;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let contentTimer: ReturnType<typeof setTimeout> | undefined;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	/** Unresisted dismiss distance in px (0 = fully open). */
	let rawPull = 0;
	/** Rubber-banded pull used for morph / velocity. */
	let pull = 0;
	let touchActive = false;
	let touchStartY = 0;
	let touchStartPull = 0;
	/** Recent pull samples for a short velocity window (iOS-style). */
	let pullSamples: { t: number; pull: number }[] = [];
	/** Last measured gesture velocity (kept across the short settle idle). */
	let gestureVelocity = 0;

	const project = $derived(getWorkProject(id));
	const overlayHeadline = $derived(project?.overlayHeadline ?? project?.title ?? '');

	/**
	 * Dismiss physics: free tracking → rising resistance into a 20% commit,
	 * then the close animation owns the rest (full ring).
	 */
	const PULL_RANGE = 340;
	const COMMIT_AT = 0.2;
	/** Morph distance at commit (full ring). */
	const COMMIT_PULL = PULL_RANGE * COMMIT_AT;
	/** 1:1 scroll until this pull; resistance ramps from here to commit. */
	const RESIST_START = COMMIT_PULL * 0.55;
	/** Extra input needed after RESIST_START to finish the ring (higher = heavier). */
	const RESIST_SPAN = COMMIT_PULL * 1.25;
	/** px/ms — ~700–1000 pts/s territory used by native sheets. */
	const FLICK_VELOCITY = 0.7;
	const DEAD_ZONE = 8;
	const VELOCITY_WINDOW_MS = 100;
	const COAST_MS = 180;
	const WHEEL_SETTLE_MS = 200;

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

	function finalRect(): Rect {
		const padY = Math.max(12, Math.min(20, window.innerHeight * 0.02));
		return {
			top: padY,
			left: cssLength('calc(var(--grid-offset) + var(--grid-pad))'),
			width: cssLength('var(--span-8)'),
			height: window.innerHeight - padY * 2,
			radius: '1.75rem'
		};
	}

	function thumbRect(): Rect {
		if (origin) {
			return {
				top: origin.top,
				left: origin.left,
				width: origin.width,
				height: origin.height,
				radius: origin.radius
			};
		}
		const open = openRect ?? finalRect();
		return {
			top: open.top + 40,
			left: open.left + open.width * 0.05,
			width: open.width * 0.9,
			height: open.height * 0.9,
			radius: open.radius
		};
	}

	function stagePose(pose: MagnetPose | undefined): MagnetPose {
		const p = pose ?? ZERO_POSE;
		if (p.x === 0 && p.y === 0 && p.r === 0) {
			const open = openRect ?? finalRect();
			const thumb = thumbRect();
			const dx = thumb.left + thumb.width / 2 - (open.left + open.width / 2);
			const dy = thumb.top + thumb.height / 2 - (open.top + open.height / 2);
			return {
				x: Math.max(-3, Math.min(3, dx * 0.018)),
				y: Math.max(-3, Math.min(3, dy * 0.018)),
				r: Math.max(-2, Math.min(2, dx * 0.01 + dy * 0.004))
			};
		}
		return { x: p.x * 1.35, y: p.y * 1.35, r: p.r * 1.25 };
	}

	function lerp(a: number, b: number, t: number) {
		return a + (b - a) * t;
	}

	function clamp01(t: number) {
		return Math.min(1, Math.max(0, t));
	}

	/**
	 * Map raw scroll/drag input → morph pull.
	 * Free at first, then increasingly heavy until the 20% commit point.
	 */
	function mapInputToPull(input: number) {
		const value = Math.max(0, input);
		if (value <= RESIST_START) return value;
		const overshoot = value - RESIST_START;
		const room = COMMIT_PULL - RESIST_START;
		if (overshoot >= RESIST_SPAN) return COMMIT_PULL;
		const u = overshoot / RESIST_SPAN;
		// Ease-out — noticeable slowdown into the commit, without a hard wall.
		const eased = 1 - Math.pow(1 - u, 2.1);
		return RESIST_START + room * eased;
	}

	/** Linear morph progress from applied (resisted) pull. */
	function progressFromPull(applied: number) {
		return clamp01(applied / PULL_RANGE);
	}

	function ringFromProgress(progress: number) {
		return clamp01(progress / COMMIT_AT);
	}

	function atCommit(applied = pull) {
		return applied >= COMMIT_PULL - 0.5;
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

	function clearPullSamples() {
		pullSamples = [];
		gestureVelocity = 0;
	}

	function mixRect(from: Rect, to: Rect, t: number): Rect {
		const p = clamp01(t);
		return {
			top: lerp(from.top, to.top, p),
			left: lerp(from.left, to.left, p),
			width: lerp(from.width, to.width, p),
			height: lerp(from.height, to.height, p),
			radius: p < 0.55 ? from.radius : to.radius
		};
	}

	function applyChrome(
		el: HTMLElement,
		rect: Rect,
		pose: MagnetPose,
		animate: boolean,
		opts?: { duration?: number; ease?: string }
	) {
		const duration = opts?.duration ?? motion.openDuration;
		const ease = opts?.ease ?? motion.openEase;
		el.style.transition = animate
			? [
					`top ${duration}ms ${ease}`,
					`left ${duration}ms ${ease}`,
					`width ${duration}ms ${ease}`,
					`height ${duration}ms ${ease}`,
					`border-radius ${duration}ms ${ease}`,
					`transform ${duration}ms ${ease}`
				].join(', ')
			: 'none';
		el.style.top = `${rect.top}px`;
		el.style.left = `${rect.left}px`;
		el.style.width = `${rect.width}px`;
		el.style.height = `${rect.height}px`;
		el.style.borderRadius = rect.radius;
		el.style.transform = poseTransform(pose);
	}

	function playHero() {
		if (!videoEl || !project?.video) return;
		resumeVideo(project.video, videoEl, () => {
			videoReady = true;
		});
	}

	function syncHero() {
		if (!videoEl || !project?.video) return;
		rememberVideoTime(project.video, videoEl);
	}

	function atScrollerTop() {
		return !scrollerEl || scrollerEl.scrollTop <= 0;
	}

	function paintDismiss(nextRaw: number) {
		if (!cardEl || !openRect || closing) return;
		rawPull = Math.max(0, nextRaw);
		pull = mapInputToPull(rawPull);
		notePullSample(pull);
		const progress = progressFromPull(pull);
		dismissProgress = progress;
		ringProgress = ringFromProgress(progress);
		dismissing = pull > DEAD_ZONE;
		if (pull > DEAD_ZONE) {
			contentVisible = false;
			if (scrollerEl) scrollerEl.scrollTop = 0;
		}

		const angle = stagePose(origin?.pose);
		// Tilt eases in slightly behind the rect so the morph stays readable.
		const poseProgress = clamp01(progress * progress);
		applyChrome(
			cardEl,
			mixRect(openRect, thumbRect(), progress),
			lerpPose(ZERO_POSE, angle, poseProgress),
			false
		);
	}

	/** Full ring reached — freeze scroll morph and let the close animation finish. */
	function commitClose() {
		if (closing) return;
		clearTimeout(settleTimer);
		touchActive = false;
		rawPull = RESIST_START + RESIST_SPAN;
		pull = COMMIT_PULL;
		dismissProgress = COMMIT_AT;
		ringProgress = 1;
		dismissing = true;
		if (cardEl && openRect) {
			const angle = stagePose(origin?.pose);
			applyChrome(
				cardEl,
				mixRect(openRect, thumbRect(), COMMIT_AT),
				lerpPose(ZERO_POSE, angle, COMMIT_AT * COMMIT_AT),
				false
			);
		}
		snapClose(COMMIT_AT);
	}

	function springOpen() {
		if (!cardEl || !openRect || closing) return;
		rawPull = 0;
		pull = 0;
		dismissProgress = 0;
		ringProgress = 0;
		dismissing = false;
		clearPullSamples();
		applyChrome(cardEl, openRect, ZERO_POSE, true, {
			duration: Math.min(280, motion.openDuration),
			ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
		});
		clearTimeout(contentTimer);
		contentTimer = setTimeout(() => {
			if (!closing) contentVisible = true;
		}, Math.min(280, motion.openDuration));
	}

	function snapClose(fromProgress = dismissProgress) {
		if (closing) return;
		closing = true;
		cancelAnimationFrame(openFrame);
		clearTimeout(settleTimer);
		clearTimeout(contentTimer);
		contentVisible = false;
		syncHero();
		playHero();

		if (!cardEl) {
			finishClose();
			return;
		}

		if (reduceMotion) {
			expanded = false;
			finishClose();
			return;
		}

		const thumb = thumbRect();
		const angle = stagePose(origin?.pose);
		if (!openRect) {
			applyChrome(cardEl, thumb, angle, false);
		} else {
			applyChrome(
				cardEl,
				mixRect(openRect, thumb, fromProgress),
				lerpPose(ZERO_POSE, angle, fromProgress),
				false
			);
		}

		expanded = false;
		dismissing = false;
		ringProgress = 1;
		rawPull = 0;
		pull = 0;
		clearPullSamples();

		requestAnimationFrame(() => {
			if (!cardEl) {
				finishClose();
				return;
			}
			const start = clamp01(Math.min(fromProgress, COMMIT_AT));
			// From a full ring, play the remaining half at the normal close pace.
			const duration = Math.round(motion.closeDuration * Math.max(0.35, 1 - start));
			applyChrome(cardEl, thumb, angle, true, {
				duration,
				ease: motion.closeEase
			});
			clearTimeout(closeTimer);
			closeTimer = setTimeout(finishClose, duration);
		});
	}

	function settleDismiss(velocity = gestureVelocity) {
		if (closing) return;
		const progress = progressFromPull(pull);
		// Inertia projection decides commit vs cancel — animation always starts from here.
		const projected = progress + (velocity * COAST_MS) / PULL_RANGE;
		const shouldSnap =
			atCommit() ||
			projected >= COMMIT_AT ||
			(progress > 0.1 && velocity >= FLICK_VELOCITY);

		clearPullSamples();
		if (shouldSnap) {
			if (atCommit()) {
				commitClose();
				return;
			}
			snapClose(progress);
			return;
		}
		springOpen();
	}

	function onWheel(event: WheelEvent) {
		if (!expanded || !cardEl || !openRect || closing || reduceMotion || touchActive) return;

		// Scroll the project body normally; dismiss only from the hero top.
		if (contentVisible && pull <= DEAD_ZONE) {
			if (event.deltaY >= 0) return;
			if (!atScrollerTop()) return;
		} else if (pull <= DEAD_ZONE && event.deltaY >= 0) {
			return;
		}

		event.preventDefault();
		// Pixel trackpads are denser; line/page wheels need a touch more gain.
		const gain = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? 1 : 1.2;
		paintDismiss(rawPull - event.deltaY * gain);

		clearTimeout(settleTimer);

		// Full ring — stop scroll morph; closing animation takes over.
		if (atCommit()) {
			commitClose();
			return;
		}

		// Below commit — wait for release, then snap or spring back.
		settleTimer = setTimeout(() => settleDismiss(), WHEEL_SETTLE_MS);
	}

	function onTouchStart(event: TouchEvent) {
		if (!expanded || closing || reduceMotion) return;
		const touch = event.touches[0];
		if (!touch) return;
		touchActive = true;
		touchStartY = touch.clientY;
		touchStartPull = rawPull;
		clearPullSamples();
		notePullSample(pull);
		clearTimeout(settleTimer);
	}

	function onTouchMove(event: TouchEvent) {
		if (!touchActive || !expanded || !openRect || closing || reduceMotion) return;
		const touch = event.touches[0];
		if (!touch) return;

		const drag = touch.clientY - touchStartY;
		if (drag <= 0 && pull <= DEAD_ZONE) return;
		if (contentVisible && pull <= DEAD_ZONE && !atScrollerTop()) return;

		event.preventDefault();
		paintDismiss(touchStartPull + drag);

		if (atCommit()) {
			commitClose();
		}
	}

	function onTouchEnd() {
		if (!touchActive) return;
		touchActive = false;
		if (pull > DEAD_ZONE) settleDismiss();
		else if (pull > 0) springOpen();
	}

	function close() {
		if (closing) return;

		if (contentVisible && pull <= 0) {
			closing = true;
			clearTimeout(contentTimer);
			contentVisible = false;
			if (scrollerEl) scrollerEl.scrollTop = 0;
			syncHero();
			clearTimeout(closeTimer);
			closeTimer = setTimeout(() => {
				closing = false;
				snapClose(0);
			}, motion.closeContentMs);
			return;
		}

		snapClose(progressFromPull(pull));
	}

	function finishClose() {
		rendered = false;
		expanded = false;
		contentVisible = false;
		closing = false;
		dismissing = false;
		dismissProgress = 0;
		ringProgress = 0;
		rawPull = 0;
		pull = 0;
		clearPullSamples();
		openRect = null;
		videoReady = false;
		id = null;
		origin = null;
		closeProject();
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !closing) close();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && rendered && !closing) close();
	}

	function onResize() {
		if (!expanded || !cardEl || closing) return;
		openRect = finalRect();
		if (pull > 0) paintDismiss(pull);
		else applyChrome(cardEl, openRect, ZERO_POSE, false);
	}

	$effect(() => {
		const unsubMotion = activeMotionPresetId.subscribe((value) => {
			motion = getMotionPreset(value);
		});
		const unsubId = openProjectId.subscribe((value) => {
			clearTimeout(closeTimer);
			clearTimeout(contentTimer);
			clearTimeout(settleTimer);
			cancelAnimationFrame(openFrame);

			if (value) {
				closing = false;
				dismissing = false;
				dismissProgress = 0;
				ringProgress = 0;
				rawPull = 0;
				pull = 0;
				clearPullSamples();
				openRect = null;
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
		};
	});

	$effect(() => {
		if (!browser || !rendered || !cardEl || !project) return;

		document.body.style.overflow = 'hidden';
		playHero();
		rawPull = 0;
		pull = 0;
		dismissProgress = 0;
		ringProgress = 0;
		dismissing = false;
		clearPullSamples();
		contentVisible = false;

		const target = finalRect();
		openRect = target;
		const from: Rect = origin
			? {
					top: origin.top,
					left: origin.left,
					width: origin.width,
					height: origin.height,
					radius: origin.radius
				}
			: {
					top: target.top + 24,
					left: target.left + 24,
					width: target.width - 48,
					height: target.height - 48,
					radius: '1.75rem'
				};
		const fromPose = stagePose(origin?.pose);

		const revealContent = () => {
			if (closing) return;
			contentVisible = true;
		};

		if (reduceMotion) {
			applyChrome(cardEl, target, ZERO_POSE, false);
			expanded = true;
			revealContent();
		} else {
			applyChrome(cardEl, from, fromPose, false);
			openFrame = requestAnimationFrame(() => {
				openFrame = requestAnimationFrame(() => {
					if (!cardEl || closing) return;
					applyChrome(cardEl, target, ZERO_POSE, true);
					expanded = true;
					clearTimeout(contentTimer);
					contentTimer = setTimeout(revealContent, motion.openDuration);
				});
			});
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		if (rendered && project?.video) playHero();
	});

	$effect(() => {
		if (!browser || !videoEl || !project?.video || !rendered) return;
		const el = videoEl;
		const src = project.video;
		const onTime = () => rememberVideoTime(src, el);
		el.addEventListener('timeupdate', onTime);
		return () => {
			rememberVideoTime(src, el);
			el.removeEventListener('timeupdate', onTime);
		};
	});

	$effect(() => {
		if (!browser || !expanded || closing) return;
		const wheelOpts: AddEventListenerOptions = { passive: false };
		const touchOpts: AddEventListenerOptions = { passive: false };

		window.addEventListener('wheel', onWheel, wheelOpts);
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchmove', onTouchMove, touchOpts);
		window.addEventListener('touchend', onTouchEnd);
		window.addEventListener('touchcancel', onTouchEnd);

		return () => {
			window.removeEventListener('wheel', onWheel, wheelOpts);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchmove', onTouchMove, touchOpts);
			window.removeEventListener('touchend', onTouchEnd);
			window.removeEventListener('touchcancel', onTouchEnd);
		};
	});
</script>

<svelte:window onkeydown={onKeydown} onresize={onResize} />

{#if rendered && project}
	<div
		class="backdrop"
		class:expanded
		role="presentation"
		style:--motion-backdrop="{expanded ? motion.backdropMs : motion.closeBackdropMs}ms"
		style:--motion-content="{contentVisible ? motion.contentMs : motion.closeContentMs}ms"
		style:--motion-ease={expanded ? motion.openEase : motion.closeEase}
		style:--dismiss-progress={dismissProgress}
		onclick={onBackdropClick}
	>
		<div
			bind:this={cardEl}
			class="card"
			class:expanded
			class:content={contentVisible}
			class:dismissing
			role="dialog"
			aria-modal="true"
			aria-labelledby="project-card-title"
			tabindex="-1"
		>
			<div
				class="dismiss-ring"
				class:active={ringProgress > 0.001}
				style:--ring-progress={ringProgress}
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24">
					<circle class="ring-track" cx="12" cy="12" r="10" />
					<circle class="ring-progress" cx="12" cy="12" r="10" />
				</svg>
			</div>

			<button type="button" class="close" aria-label="Close project" onclick={close}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M7 7l10 10M17 7L7 17"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
			</button>

			<div class="scroller" bind:this={scrollerEl}>
				<section class="stage">
					<div
						class="hero"
						aria-hidden="true"
						style:background-image={origin?.poster ? `url(${origin.poster})` : undefined}
					>
						{#if project.video}
							<video
								bind:this={videoEl}
								class="hero-video"
								class:ready={videoReady}
								src={project.video}
								poster={origin?.poster ?? undefined}
								muted
								loop
								playsinline
								preload="auto"
							></video>
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
		background: rgb(0 0 0 / calc(0.4 * (1 - var(--dismiss-progress, 0) * 0.85)));
	}

	.card {
		/* Middle 4 of the 8-col grid (card itself is span-8). */
		--project-copy-width: var(--span-4);
		position: fixed;
		z-index: 81;
		overflow: hidden;
		background: var(--color-bg);
		color: var(--color-text);
		outline: none;
		transform-origin: center center;
		will-change: top, left, width, height, border-radius, transform;
	}

	.card.dismissing {
		cursor: grabbing;
	}

	.scroller {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.card.expanded.content .scroller {
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: none;
	}

	/* First screen: full-bleed media + caption. */
	.stage {
		position: relative;
		height: 100%;
		min-height: 100%;
		overflow: hidden;
		background: #111;
		color: #fff;
	}

	.card:not(.content) .stage {
		height: 100%;
	}

	.hero {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background-color: #111;
		background-size: cover;
		background-position: center;
	}

	.hero-video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		pointer-events: none;
		opacity: 0;
	}

	.hero-video.ready {
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

	.card.dismissing .caption {
		opacity: 0;
		pointer-events: none;
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

	/* Rest of the project scrolls below the hero — never over it. */
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

	.card.dismissing .details {
		opacity: 0;
		pointer-events: none;
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

	.details-inner > p {
		margin: 0 0 0.95rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-muted);
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
		top: 1rem;
		left: 50%;
		z-index: 5;
		width: 24px;
		height: 24px;
		opacity: 0;
		transform: translateX(-50%);
		pointer-events: none;
	}

	.dismiss-ring.active {
		opacity: 1;
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

	.close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 5;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.42);
		color: #fff;
		cursor: pointer;
		opacity: 0;
		transform: scale(0.92);
		pointer-events: none;
		backdrop-filter: blur(8px);
		transition:
			opacity var(--motion-content, 180ms) var(--motion-ease, ease),
			transform var(--motion-content, 180ms) var(--motion-ease, ease),
			background-color 140ms ease;
	}

	.card.content .close {
		opacity: 1;
		transform: scale(1);
		pointer-events: auto;
	}

	.card.dismissing .close {
		opacity: 0;
		transform: scale(0.92);
		pointer-events: none;
	}

	.close:hover {
		background: rgb(0 0 0 / 0.58);
	}

	.close svg {
		width: 1.1rem;
		height: 1.1rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.backdrop,
		.card,
		.caption,
		.details,
		.dismiss-ring,
		.close {
			transition: none !important;
		}

		.hero-video {
			display: none;
		}
	}
</style>
