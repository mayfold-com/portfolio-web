/** Lightweight helpers for poster capture. Playback handoff uses videoHost (one element). */

/** Grab the current painted frame so the sheet can cover the grey load gap. */
export function captureVideoFrame(el: HTMLVideoElement | undefined): string | null {
	if (!el || el.readyState < 2 || !el.videoWidth || !el.videoHeight) return null;

	const canvas = document.createElement('canvas');
	canvas.width = el.videoWidth;
	canvas.height = el.videoHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	try {
		ctx.drawImage(el, 0, 0);
		return canvas.toDataURL('image/jpeg', 0.86);
	} catch {
		return null;
	}
}
