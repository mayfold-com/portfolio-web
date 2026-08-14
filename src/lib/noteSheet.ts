import { browser } from '$app/environment';
import { goto, pushState, replaceState } from '$app/navigation';
import { page } from '$app/stores';
import { get, writable } from 'svelte/store';

export type NoteOrigin = {
	top: number;
	left: number;
	width: number;
	height: number;
	radius: string;
};

export const openNoteId = writable<string | null>(null);
export const noteOrigin = writable<NoteOrigin | null>(null);

/** Open at the settled window rect — no morph from the list. */
export let noteOpensDirect = false;

const NOTE_PARAM = 'note';

let noteHistoryMode: 'push' | 'replace' | null = null;
const hydratedFromUrlIds = new Set<string>();

export function shouldHydrateNoteFromUrl(id: string): boolean {
	return !hydratedFromUrlIds.has(id);
}

export function noteIdFromUrl(url: URL = get(page).url): string | null {
	return url.searchParams.get(NOTE_PARAM);
}

export function noteIdFromPage(pageValue: {
	url: URL;
	state: App.PageState;
} = get(page)): string | null {
	return pageValue.state.noteId ?? noteIdFromUrl(pageValue.url);
}

function hrefForNote(id: string | null, from = get(page).url): string {
	const url = new URL(from);
	url.searchParams.delete('project');
	if (id) url.searchParams.set(NOTE_PARAM, id);
	else url.searchParams.delete(NOTE_PARAM);
	return `${url.pathname}${url.search}${url.hash}`;
}

function notePageState(id: string | null, current = get(page).state): App.PageState {
	const { projectId: _projectId, noteId: _noteId, ...rest } = current;
	return id ? { ...rest, noteId: id } : rest;
}

export function findNoteSource(id: string): HTMLElement | null {
	if (!browser) return null;
	const root = document.querySelector(`[data-note-id="${CSS.escape(id)}"]`);
	if (!(root instanceof HTMLElement)) return null;
	return (
		root.querySelector<HTMLElement>('[data-note-origin], [data-project-origin]') ?? root
	);
}

function captureOrigin(source?: HTMLElement | null): NoteOrigin | null {
	if (!source) return null;
	const rect = source.getBoundingClientRect();
	const radius = getComputedStyle(source).borderRadius || '0.75rem';
	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
		radius
	};
}

export function captureNoteOrigin(
	id: string,
	source?: HTMLElement | null,
	opts?: { scrollIntoView?: boolean }
): NoteOrigin | null {
	const el = source ?? findNoteSource(id);
	if (!el) return null;
	if (opts?.scrollIntoView) {
		el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
	}
	return captureOrigin(el);
}

export function waitForNoteSource(
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

			const el = findNoteSource(id);
			if (el) {
				void doubleRaf().then(() => {
					if (signal?.aborted) {
						finish(null);
						return;
					}
					finish(findNoteSource(id));
				});
				return;
			}

			if (performance.now() - start >= timeoutMs) {
				finish(null);
				return;
			}

			raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
	});
}

export function openNote(
	id: string,
	source?: HTMLElement,
	_pointer?: MouseEvent,
	options?: { syncUrl?: boolean; direct?: boolean }
) {
	const alreadyOpen = get(openNoteId) === id;
	noteOpensDirect = options?.direct === true;

	if (noteOpensDirect) {
		noteOrigin.set(null);
	} else if (!alreadyOpen || source) {
		const origin = captureNoteOrigin(id, source, {
			scrollIntoView: !source
		});
		if (origin) {
			noteOrigin.set(origin);
		} else if (!alreadyOpen) {
			noteOrigin.set(null);
		}
	}

	if (browser && options?.syncUrl !== false) {
		const current = get(page);
		const href = hrefForNote(id, current.url);

		if (current.state.noteId === id && !current.state.projectId) {
			// already in sync
		} else if (noteIdFromUrl(current.url) === id || noteIdFromUrl(new URL(location.href)) === id) {
			replaceState(href, notePageState(id, current.state));
			noteHistoryMode = 'replace';
		} else {
			pushState(href, notePageState(id, current.state));
			noteHistoryMode = 'push';
		}
	}

	if (!alreadyOpen) {
		openNoteId.set(id);
	}
}

export function hydrateNoteFromUrl(id: string) {
	if (!browser) return;
	const current = get(page);
	hydratedFromUrlIds.add(id);
	if (current.state.noteId === id && !current.state.projectId) return;
	replaceState(hrefForNote(id, current.url), notePageState(id, current.state));
	noteHistoryMode = 'replace';
}

export function clearNote() {
	openNoteId.set(null);
	noteOrigin.set(null);
}

export function syncNoteUrlAfterClose() {
	if (!browser) return;

	const current = get(page);
	const mode = noteHistoryMode;
	noteHistoryMode = null;
	const restState = notePageState(null, current.state);

	if (mode === 'replace') {
		void goto(hrefForNote(null, current.url), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
			state: restState
		});
		return;
	}

	if (current.state.noteId) {
		history.back();
		return;
	}

	if (noteIdFromUrl(current.url) || noteIdFromUrl(new URL(location.href))) {
		void goto(hrefForNote(null, current.url), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
			state: restState
		});
	}
}
