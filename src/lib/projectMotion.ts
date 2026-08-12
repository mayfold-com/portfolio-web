import { derived, writable } from 'svelte/store';

export type MotionSpeedId = 'slow' | 'medium' | 'fast' | 'snap';
export type CloseEaseId = 'soft' | 'snappy' | 'expo' | 'decel' | 'sharp' | 'linear';

export type MotionPreset = {
	id: MotionSpeedId;
	label: string;
	openDuration: number;
	closeDuration: number;
	openEase: string;
	closeEase: string;
	closeEaseId: CloseEaseId;
	contentMs: number;
	contentDelay: number;
	closeContentMs: number;
	backdropMs: number;
	closeBackdropMs: number;
};

export type CloseEaseOption = {
	id: CloseEaseId;
	label: string;
	ease: string;
};

/** Shared snappy character for open. */
const OPEN_EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';

export const closeEaseOptions: CloseEaseOption[] = [
	{ id: 'soft', label: 'Soft land', ease: 'cubic-bezier(0.32, 0.72, 0, 1)' },
	{ id: 'snappy', label: 'Snappy', ease: 'cubic-bezier(0.2, 0.9, 0.2, 1)' },
	{ id: 'expo', label: 'Expo out', ease: 'cubic-bezier(0.16, 1, 0.3, 1)' },
	{ id: 'decel', label: 'Ease in', ease: 'cubic-bezier(0.55, 0.05, 0.85, 0.35)' },
	{ id: 'sharp', label: 'Overshoot', ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
	{ id: 'linear', label: 'Linear', ease: 'linear' }
];

type SpeedBase = Omit<MotionPreset, 'closeEase' | 'closeEaseId'>;

export const motionPresets: SpeedBase[] = [
	{
		id: 'slow',
		label: 'Slow',
		openDuration: 380,
		closeDuration: 460,
		openEase: OPEN_EASE,
		contentMs: 260,
		contentDelay: 70,
		closeContentMs: 160,
		backdropMs: 320,
		closeBackdropMs: 400
	},
	{
		id: 'medium',
		label: 'Medium',
		openDuration: 260,
		closeDuration: 300,
		openEase: OPEN_EASE,
		contentMs: 180,
		contentDelay: 40,
		closeContentMs: 100,
		backdropMs: 220,
		closeBackdropMs: 260
	},
	{
		id: 'fast',
		label: 'Fast',
		openDuration: 180,
		closeDuration: 200,
		openEase: OPEN_EASE,
		contentMs: 130,
		contentDelay: 24,
		closeContentMs: 70,
		backdropMs: 160,
		closeBackdropMs: 170
	},
	{
		id: 'snap',
		label: 'Snap',
		openDuration: 150,
		closeDuration: 150,
		openEase: OPEN_EASE,
		contentMs: 110,
		contentDelay: 16,
		closeContentMs: 50,
		backdropMs: 130,
		closeBackdropMs: 130
	}
];

export const defaultMotionPresetId: MotionSpeedId = 'fast';
export const defaultCloseEaseId: CloseEaseId = 'soft';
export const motionStorageKey = 'naim-project-speed';
export const closeEaseStorageKey = 'naim-project-close-ease';

export function isMotionPresetId(value: string | null | undefined): value is MotionSpeedId {
	return motionPresets.some((preset) => preset.id === value);
}

export function isCloseEaseId(value: string | null | undefined): value is CloseEaseId {
	return closeEaseOptions.some((option) => option.id === value);
}

export function getCloseEase(id: CloseEaseId): CloseEaseOption {
	return closeEaseOptions.find((option) => option.id === id) ?? closeEaseOptions[0];
}

export function getMotionPreset(
	speedId: MotionSpeedId = defaultMotionPresetId,
	closeEaseId: CloseEaseId = defaultCloseEaseId
): MotionPreset {
	const base = motionPresets.find((preset) => preset.id === speedId) ?? motionPresets[1];
	const close = getCloseEase(closeEaseId);
	return {
		...base,
		closeEaseId: close.id,
		closeEase: close.ease
	};
}

export const activeMotionPresetId = writable<MotionSpeedId>(defaultMotionPresetId);
export const activeCloseEaseId = writable<CloseEaseId>(defaultCloseEaseId);

export const activeMotion = derived(
	[activeMotionPresetId, activeCloseEaseId],
	([$speed, $ease]) => getMotionPreset($speed, $ease)
);

export function setMotionPreset(id: MotionSpeedId) {
	activeMotionPresetId.set(id);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(motionStorageKey, id);
	}
}

export function setCloseEase(id: CloseEaseId) {
	activeCloseEaseId.set(id);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(closeEaseStorageKey, id);
	}
}
