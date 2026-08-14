import { browser } from '$app/environment';
import { goto, pushState, replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { get, writable } from 'svelte/store';
import { captureVideoFrame } from '$lib/videoPlayback';
import type { VideoOrigin } from '$lib/videoHost';

export type ProjectOrigin = {
	top: number;
	left: number;
	width: number;
	height: number;
	radius: string;
	/** Still frame / poster — avoids a grey flash on open. */
	poster: string | null;
	/** Live card video to borrow into the sheet (one decoder). */
	video: VideoOrigin | null;
};

/** Currently open project id, or null when closed. */
export const openProjectId = writable<string | null>(null);

/** Screen rect of the card that was clicked — used for FLIP open/close. */
export const projectOrigin = writable<ProjectOrigin | null>(null);

const PROJECT_PARAM = 'project';

/**
 * Whether the open project layer was `pushState` (Back dismisses) or `replaceState`
 * (cold/shared `?project=` — strip the query in place; Back would leave the site).
 */
let projectHistoryMode: 'push' | 'replace' | null = null;

/**
 * Cold/shared ids already promoted into page state this session.
 * SvelteKit `replaceState` can leave `page.url` with `?project=` after dismiss, which
 * would otherwise re-trigger hydrate and reopen the sheet.
 */
const hydratedFromUrlIds = new Set<string>();

/** True when a cold/shared `?project=` id still needs a one-shot hydrate. */
export function shouldHydrateProjectFromUrl(id: string): boolean {
	return !hydratedFromUrlIds.has(id);
}

/** Visible/shareable query param (browser location). Not always mirrored in `page.url`. */
export function projectIdFromUrl(url: URL = get(page).url): string | null {
	return url.searchParams.get(PROJECT_PARAM);
}

/**
 * Source of truth for shallow history (Back / Forward).
 * SvelteKit keeps `page.url` on the underlying route and stores modal state in `page.state`.
 */
export function projectIdFromPage(pageValue: {
	url: URL;
	state: App.PageState;
} = get(page)): string | null {
	return pageValue.state.projectId ?? projectIdFromUrl(pageValue.url);
}

function hrefForProject(id: string | null, from = get(page).url): string {
	const url = new URL(from);
	url.searchParams.delete('note');
	if (id) url.searchParams.set(PROJECT_PARAM, id);
	else url.searchParams.delete(PROJECT_PARAM);
	return `${url.pathname}${url.search}${url.hash}`;
}

function projectPageState(id: string | null, current = get(page).state): App.PageState {
	const { projectId: _projectId, noteId: _noteId, ...rest } = current;
	return id ? { ...rest, projectId: id } : rest;
}

/** Card media node for a project — used for click morph and Back/Forward morph. */
export function findProjectSource(id: string): HTMLElement | null {
	if (!browser) return null;
	const root = document.querySelector(`[data-project-id="${CSS.escape(id)}"]`);
	if (!(root instanceof HTMLElement)) return null;
	return root.querySelector<HTMLElement>('[data-project-origin]') ?? root;
}

function captureOrigin(source?: HTMLElement | null): ProjectOrigin | null {
	if (!source) return null;

	const rect = source.getBoundingClientRect();
	const radius = getComputedStyle(source).borderRadius || '1.75rem';

	const home =
		source.querySelector<HTMLElement>('[data-video-home]') ??
		source.closest('button')?.querySelector<HTMLElement>('[data-video-home]') ??
		null;

	const video =
		home?.querySelector('video') ??
		source.querySelector('video') ??
		source.closest('button')?.querySelector('video') ??
		null;

	let poster: string | null = null;
	let videoOrigin: VideoOrigin | null = null;

	if (video instanceof HTMLVideoElement && home) {
		poster = captureVideoFrame(video);
		videoOrigin = { el: video, home };
	}

	if (!poster && video instanceof HTMLVideoElement) {
		poster = video.getAttribute('poster');
	}

	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		radius,
		poster,
		video: videoOrigin
	};
}

/** Live thumb geometry for open/close morph (re-measured so scroll position stays honest). */
export function captureProjectOrigin(
	id: string,
	source?: HTMLElement | null,
	opts?: { scrollIntoView?: boolean }
): ProjectOrigin | null {
	const el = source ?? findProjectSource(id);
	if (!el) return null;

	if (opts?.scrollIntoView) {
		el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
	}

	return captureOrigin(el);
}

/**
 * Wait until the project card thumb is in the DOM (and laid out) so cold/shared
 * links can morph from it instead of opening with the inset fallback.
 * Resolves null if the card never appears (timeout) — caller may still open.
 */
export function waitForProjectSource(
	id: string,
	opts?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<HTMLElement | null> {
	if (!browser) return Promise.resolve(null);

	const timeoutMs = opts?.timeoutMs ?? 2000;
	const signal = opts?.signal;

	const doubleRaf = (): Promise<void> =>
		new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => resolve());
			});
		});

	return new Promise((resolve) => {
		if (signal?.aborted) {
			resolve(null);
			return;
		}

		const start = performance.now();
		let raf = 0;

		const finish = (el: HTMLElement | null) => {
			cancelAnimationFrame(raf);
			signal?.removeEventListener('abort', onAbort);
			resolve(el);
		};

		const onAbort = () => finish(null);
		signal?.addEventListener('abort', onAbort, { once: true });

		const tick = () => {
			if (signal?.aborted) {
				finish(null);
				return;
			}

			const el = findProjectSource(id);
			if (el) {
				void doubleRaf().then(() => {
					if (signal?.aborted) {
						finish(null);
						return;
					}
					// Re-query after paint so layout/scroll metrics are honest.
					finish(findProjectSource(id));
				});
				return;
			}

			if (performance.now() - start >= timeoutMs) {
				finish(null);
				return;
			}

			raf = requestAnimationFrame(tick);
		};

		// Give the route a frame to mount cards before the first query.
		raf = requestAnimationFrame(tick);
	});
}

/**
 * Open a case. Pushes history + `?project=<id>` so Back dismisses and Forward reopens.
 * Pass `{ syncUrl: false }` when history already points at this id.
 */
export function openProject(
	id: string,
	source?: HTMLElement,
	_pointer?: MouseEvent,
	options?: { syncUrl?: boolean }
) {
	const alreadyOpen = get(openProjectId) === id;

	// Click path uses the event target; Forward / shared links resolve the thumb in the DOM.
	if (!alreadyOpen || source) {
		const origin = captureProjectOrigin(id, source, {
			scrollIntoView: !source
		});
		if (origin) {
			projectOrigin.set(origin);
		} else if (!alreadyOpen) {
			projectOrigin.set(null);
		}
	}

	// Push/replace history before the store so subscribers see a consistent target.
	if (browser && options?.syncUrl !== false) {
		const current = get(page);
		const href = hrefForProject(id, current.url);

		if (current.state.projectId === id && !current.state.noteId) {
			// already in sync
		} else if (projectIdFromUrl(current.url) === id || projectIdFromUrl(new URL(location.href)) === id) {
			// Shared / refreshed link — keep this history entry, attach dismissable state.
			replaceState(href, projectPageState(id, current.state));
			projectHistoryMode = 'replace';
		} else {
			pushState(href, projectPageState(id, current.state));
			projectHistoryMode = 'push';
		}
	}

	if (!alreadyOpen) {
		openProjectId.set(id);
	}
}

/** Attach `page.state.projectId` for a cold load that already has `?project=` in the URL. */
export function hydrateProjectFromUrl(id: string) {
	if (!browser) return;
	const current = get(page);
	hydratedFromUrlIds.add(id);
	if (current.state.projectId === id && !current.state.noteId) return;
	replaceState(hrefForProject(id, current.url), projectPageState(id, current.state));
	projectHistoryMode = 'replace';
}

/** Clear store after the close animation (does not touch history). */
export function clearProject() {
	openProjectId.set(null);
	projectOrigin.set(null);
}

/**
 * Sync history after a UI dismiss (Escape / backdrop / overscroll).
 * No-ops when Back already cleared `page.state.projectId`.
 */
export function syncUrlAfterClose() {
	if (!browser) return;

	const current = get(page);
	const mode = projectHistoryMode;
	projectHistoryMode = null;
	const restState = projectPageState(null, current.state);

	// Cold/shared link used replaceState — `goto` clears `page.url` (plain replaceState does not).
	if (mode === 'replace') {
		void goto(hrefForProject(null, current.url), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
			state: restState
		});
		return;
	}

	if (current.state.projectId) {
		history.back();
		return;
	}

	// Cold-loaded `?project=` with no shallow state — strip the query via navigation.
	if (projectIdFromUrl(current.url) || projectIdFromUrl(new URL(location.href))) {
		void goto(hrefForProject(null, current.url), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
			state: restState
		});
	}
}

/** @deprecated Use clearProject + syncUrlAfterClose from the sheet lifecycle. */
export function closeProject() {
	clearProject();
	syncUrlAfterClose();
}
