import { writable } from 'svelte/store';
import { magnetPose, ZERO_POSE, type MagnetPose } from '$lib/magnet';
import { captureVideoFrame, rememberVideoTime } from '$lib/videoPlayback';

export type ProjectOrigin = {
	top: number;
	left: number;
	width: number;
	height: number;
	radius: string;
	/** Magnet tilt at click — carried through open/close morph. */
	pose: MagnetPose;
	/** Still frame from the thumbnail video — avoids a grey flash on open. */
	poster: string | null;
};

/** Currently open project id, or null when closed. */
export const openProjectId = writable<string | null>(null);

/** Screen rect of the card that was clicked — used for FLIP open/close. */
export const projectOrigin = writable<ProjectOrigin | null>(null);

export function openProject(id: string, source?: HTMLElement, pointer?: MouseEvent) {
	if (source) {
		const rect = source.getBoundingClientRect();
		const radius = getComputedStyle(source).borderRadius || '1.75rem';
		const pose =
			pointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
				? magnetPose(pointer, source)
				: { ...ZERO_POSE };

		const video =
			source.querySelector('video') ??
			source.closest('button')?.querySelector('video') ??
			null;

		let poster: string | null = null;
		if (video instanceof HTMLVideoElement) {
			const src = video.getAttribute('src') ?? video.currentSrc;
			rememberVideoTime(src, video);
			poster = captureVideoFrame(video);
		}

		projectOrigin.set({
			top: rect.top,
			left: rect.left,
			width: rect.width,
			height: rect.height,
			radius,
			pose,
			poster
		});
	} else {
		projectOrigin.set(null);
	}

	openProjectId.set(id);
}

export function closeProject() {
	openProjectId.set(null);
	projectOrigin.set(null);
}
