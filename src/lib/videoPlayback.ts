/** Shared muted-loop playback positions so card ↔ sheet handoff doesn't restart. */

const times = new Map<string, number>();

function keyFor(src: string) {
	try {
		return new URL(src, typeof location !== 'undefined' ? location.origin : 'http://local').pathname;
	} catch {
		return src;
	}
}

export function rememberVideoTime(src: string | undefined, el: HTMLVideoElement | undefined) {
	if (!src || !el || !Number.isFinite(el.currentTime)) return;
	times.set(keyFor(src), el.currentTime);
}

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

export function resumeVideo(
	src: string | undefined,
	el: HTMLVideoElement | undefined,
	onReady?: () => void
) {
	if (!src || !el) return;

	const saved = times.get(keyFor(src));

	const finish = () => {
		onReady?.();
		void el.play().catch(() => {});
	};

	const seekAndPlay = () => {
		if (saved == null || Math.abs(el.currentTime - saved) <= 0.04) {
			finish();
			return;
		}

		const onSeeked = () => {
			el.removeEventListener('seeked', onSeeked);
			finish();
		};
		el.addEventListener('seeked', onSeeked);

		try {
			el.currentTime = saved;
		} catch {
			el.removeEventListener('seeked', onSeeked);
			finish();
		}
	};

	if (el.readyState >= 2) {
		seekAndPlay();
	} else if (el.readyState >= 1) {
		seekAndPlay();
	} else {
		el.addEventListener('loadeddata', seekAndPlay, { once: true });
	}
}
