<script lang="ts">
	import { browser } from '$app/environment';
	import {
		activeMotionPresetId,
		defaultMotionPresetId,
		isMotionPresetId,
		motionPresets,
		motionStorageKey,
		setMotionPreset,
		type MotionSpeedId
	} from '$lib/projectMotion';

	let speedId = $state<MotionSpeedId>(defaultMotionPresetId);

	$effect(() => {
		if (!browser) return;

		const stored = localStorage.getItem(motionStorageKey);
		const initial = isMotionPresetId(stored) ? stored : defaultMotionPresetId;
		speedId = initial;
		setMotionPreset(initial);

		const unsubscribe = activeMotionPresetId.subscribe((value) => {
			speedId = value;
		});
		return unsubscribe;
	});

	function select(id: MotionSpeedId) {
		speedId = id;
		setMotionPreset(id);
	}
</script>

<div class="speed-picker" role="group" aria-label="Project animation speed">
	<span class="label">Speed</span>
	<div class="options">
		{#each motionPresets as preset (preset.id)}
			<button
				type="button"
				class="option"
				class:active={speedId === preset.id}
				aria-pressed={speedId === preset.id}
				onclick={() => select(preset.id)}
			>
				{preset.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.speed-picker {
		--trigger-size: 3.4rem;
		position: fixed;
		top: calc(1.25rem + (var(--trigger-size) + 0.75rem) * 2 + 5.1rem);
		right: 1.25rem;
		z-index: 40;
		display: grid;
		gap: 0.3rem;
		min-width: 11.5rem;
		color: var(--color-text);
		font-size: 0.72rem;
	}

	.label {
		opacity: 0.55;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.options {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.25rem;
		padding: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--color-bg) 88%, transparent);
		backdrop-filter: blur(10px);
	}

	.option {
		appearance: none;
		margin: 0;
		padding: 0.5rem 0.25rem;
		border: 0;
		border-radius: 0.4rem;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.8rem;
		opacity: 0.55;
		cursor: pointer;
		transition:
			opacity 140ms ease,
			background-color 140ms ease;
	}

	.option:hover {
		opacity: 0.85;
	}

	.option.active {
		opacity: 1;
		background: color-mix(in srgb, var(--color-text) 12%, transparent);
	}

	@media (max-width: 600px) {
		.speed-picker {
			top: auto;
			bottom: 1rem;
			right: 0.9rem;
			min-width: 10rem;
		}
	}
</style>
