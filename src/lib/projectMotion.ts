import { writable } from 'svelte/store';

export type MotionSpeedId = 'slow' | 'medium' | 'fast';

export type MotionPreset = {
	id: MotionSpeedId;
	label: string;
	openDuration: number;
	closeDuration: number;
	openEase: string;
	closeEase: string;
	contentMs: number;
	contentDelay: number;
	closeContentMs: number;
	backdropMs: number;
	closeBackdropMs: number;
};

/** Shared snappy character; only timings change between speeds. */
const OPEN_EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)';
const CLOSE_EASE = 'cubic-bezier(0.45, 0.02, 0.2, 1)';

export const motionPresets: MotionPreset[] = [
	{
		id: 'slow',
		label: 'Slow',
		openDuration: 380,
		closeDuration: 460,
		openEase: OPEN_EASE,
		closeEase: CLOSE_EASE,
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
		closeDuration: 340,
		openEase: OPEN_EASE,
		closeEase: CLOSE_EASE,
		contentMs: 180,
		contentDelay: 40,
		closeContentMs: 110,
		backdropMs: 220,
		closeBackdropMs: 300
	},
	{
		id: 'fast',
		label: 'Fast',
		openDuration: 180,
		closeDuration: 240,
		openEase: OPEN_EASE,
		closeEase: CLOSE_EASE,
		contentMs: 130,
		contentDelay: 24,
		closeContentMs: 80,
		backdropMs: 160,
		closeBackdropMs: 200
	}
];

export const defaultMotionPresetId: MotionSpeedId = 'medium';
export const motionStorageKey = 'naim-project-speed';

export function isMotionPresetId(value: string | null | undefined): value is MotionSpeedId {
	return motionPresets.some((preset) => preset.id === value);
}

export function getMotionPreset(id: MotionSpeedId): MotionPreset {
	return motionPresets.find((preset) => preset.id === id) ?? motionPresets[1];
}

export const activeMotionPresetId = writable<MotionSpeedId>(defaultMotionPresetId);

export function setMotionPreset(id: MotionSpeedId) {
	activeMotionPresetId.set(id);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(motionStorageKey, id);
	}
}
