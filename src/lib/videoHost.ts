/**
 * Single shared <video> element for card ↔ sheet.
 * The sheet borrows the card's decoder (DOM move) so open/close never seeks/resets.
 */

export type VideoOrigin = {
	el: HTMLVideoElement;
	home: HTMLElement;
};

let borrowed: VideoOrigin | null = null;

export function borrowVideo(origin: VideoOrigin, mount: HTMLElement): HTMLVideoElement {
	const { el, home } = origin;
	if (borrowed && borrowed.el !== el) {
		returnVideo();
	}
	borrowed = { el, home };
	el.classList.add('hero-video', 'ready');
	el.classList.remove('card-video');
	if (el.parentElement !== mount) mount.appendChild(el);
	void el.play().catch(() => {});
	return el;
}

export function returnVideo() {
	const lease = borrowed;
	if (!lease) return;
	borrowed = null;
	const { el, home } = lease;
	el.classList.remove('hero-video', 'ready');
	el.classList.add('card-video');
	if (home.isConnected && el.parentElement !== home) {
		home.appendChild(el);
	}
	void el.play().catch(() => {});
}

export function isBorrowed(el: HTMLVideoElement | undefined | null) {
	return Boolean(el && borrowed?.el === el);
}
