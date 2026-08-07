export const MAGNET_STRENGTH = 0.12;
export const MAGNET_MAX = 3;

/** Softer follow + rotation for large project cards. */
export const CARD_MAGNET_STRENGTH = 0.08;
export const CARD_MAGNET_MAX = 2.5;
export const CARD_ROTATE_MAX = 1.6;
export const CARD_MAGNET_LERP = 0.12;

export type MagnetPose = {
	x: number;
	y: number;
	/** rotate (Z) in deg */
	r: number;
};

export const ZERO_POSE: MagnetPose = { x: 0, y: 0, r: 0 };

export function magnetOffset(
	event: MouseEvent,
	target: HTMLElement,
	strength = MAGNET_STRENGTH,
	max = MAGNET_MAX
) {
	const rect = target.getBoundingClientRect();
	const relX = event.clientX - rect.left - rect.width / 2;
	const relY = event.clientY - rect.top - rect.height / 2;

	return {
		x: Math.max(-max, Math.min(max, relX * strength)),
		y: Math.max(-max, Math.min(max, relY * strength))
	};
}

/** Translate + subtle flat rotation from pointer position. */
export function magnetPose(
	event: MouseEvent,
	target: HTMLElement,
	options?: {
		strength?: number;
		max?: number;
		rotateMax?: number;
	}
): MagnetPose {
	const strength = options?.strength ?? CARD_MAGNET_STRENGTH;
	const max = options?.max ?? CARD_MAGNET_MAX;
	const rotateMax = options?.rotateMax ?? CARD_ROTATE_MAX;
	const rect = target.getBoundingClientRect();
	const nx = (event.clientX - rect.left) / rect.width - 0.5;
	const ny = (event.clientY - rect.top) / rect.height - 0.5;
	const offset = magnetOffset(event, target, strength, max);

	// Rotation from horizontal pull, nudged by vertical so it feels angled, not just sideways.
	const rotation = clamp(nx * rotateMax * 1.6 + ny * rotateMax * 0.35, -rotateMax, rotateMax);

	return {
		x: offset.x,
		y: offset.y,
		r: rotation
	};
}

export function lerpPose(current: MagnetPose, target: MagnetPose, t: number): MagnetPose {
	return {
		x: current.x + (target.x - current.x) * t,
		y: current.y + (target.y - current.y) * t,
		r: current.r + (target.r - current.r) * t
	};
}

export function poseNearlyEqual(a: MagnetPose, b: MagnetPose, epsilon = 0.02) {
	return (
		Math.abs(a.x - b.x) < epsilon &&
		Math.abs(a.y - b.y) < epsilon &&
		Math.abs(a.r - b.r) < epsilon
	);
}

export function poseTransform(pose: MagnetPose) {
	return `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.r}deg)`;
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}
