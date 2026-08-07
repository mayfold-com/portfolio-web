import {
	CARD_MAGNET_LERP,
	ZERO_POSE,
	lerpPose,
	magnetPose,
	poseNearlyEqual,
	type MagnetPose
} from '$lib/magnet';

type PoseOptions = Parameters<typeof magnetPose>[2];

/** Shared eased magnet + flat rotation for cards, pills, and nav. */
export class MagnetSpring {
	pose = $state<MagnetPose>({ ...ZERO_POSE });

	#target: MagnetPose = { ...ZERO_POSE };
	#raf = 0;
	#lerp: number;
	#reduceMotion: boolean;

	constructor(lerp = CARD_MAGNET_LERP) {
		this.#lerp = lerp;
		this.#reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	get reduceMotion() {
		return this.#reduceMotion;
	}

	move(event: MouseEvent, options?: PoseOptions, target?: HTMLElement) {
		if (this.#reduceMotion) return;
		const el = target ?? (event.currentTarget as HTMLElement);
		this.#target = magnetPose(event, el, options);
		this.#ensure();
	}

	release() {
		this.#target = { ...ZERO_POSE };
		if (this.#reduceMotion) {
			this.reset();
			return;
		}
		this.#ensure();
	}

	reset() {
		this.#target = { ...ZERO_POSE };
		this.pose = { ...ZERO_POSE };
		this.#stop();
	}

	destroy() {
		this.#stop();
	}

	#tick = () => {
		this.pose = lerpPose(this.pose, this.#target, this.#lerp);
		if (poseNearlyEqual(this.pose, this.#target)) {
			this.pose = { ...this.#target };
			this.#raf = 0;
			return;
		}
		this.#raf = requestAnimationFrame(this.#tick);
	};

	#ensure() {
		if (!this.#raf) this.#raf = requestAnimationFrame(this.#tick);
	}

	#stop() {
		if (this.#raf) {
			cancelAnimationFrame(this.#raf);
			this.#raf = 0;
		}
	}
}
