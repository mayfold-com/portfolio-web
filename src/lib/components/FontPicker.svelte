<script lang="ts">
	import { browser } from '$app/environment';
	import {
		applyFont,
		applyFontWeight,
		defaultFontId,
		defaultFontWeight,
		fonts,
		fontStorageKey,
		fontWeightStorageKey,
		fontWeights,
		getFont,
		isFontId,
		isFontWeight,
		type FontId,
		type FontWeight
	} from '$lib/fonts';

	let fontId = $state<FontId>(defaultFontId);
	let fontWeight = $state<FontWeight>(defaultFontWeight);
	const current = $derived(getFont(fontId));

	$effect(() => {
		if (!browser) return;

		const storedFont = localStorage.getItem(fontStorageKey);
		const initialFont = isFontId(storedFont) ? storedFont : defaultFontId;
		fontId = initialFont;
		applyFont(initialFont);

		const storedWeight = localStorage.getItem(fontWeightStorageKey);
		const initialWeight = isFontWeight(storedWeight)
			? (Number(storedWeight) as FontWeight)
			: defaultFontWeight;
		fontWeight = initialWeight;
		applyFontWeight(initialWeight);
	});

	function onFontChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!isFontId(value)) return;

		fontId = value;
		applyFont(value);
		localStorage.setItem(fontStorageKey, value);
	}

	function onWeightChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!isFontWeight(value)) return;

		const weight = Number(value) as FontWeight;
		fontWeight = weight;
		applyFontWeight(weight);
		localStorage.setItem(fontWeightStorageKey, String(weight));
	}
</script>

<div class="type-controls">
	<label class="field">
		<span class="label">Font</span>
		<select
			aria-label="Choose typeface"
			value={fontId}
			onchange={onFontChange}
			style:font-family="'{current.family}', sans-serif"
			style:font-variation-settings={current.variation ?? 'normal'}
			style:font-feature-settings={current.features ?? 'normal'}
			style:font-weight={fontWeight}
		>
			{#each fonts as font (font.id)}
				<option value={font.id}>{font.label}</option>
			{/each}
		</select>
	</label>

	<label class="field weight">
		<span class="label">Weight</span>
		<select
			aria-label="Choose font weight"
			value={fontWeight}
			onchange={onWeightChange}
			style:font-family="'{current.family}', sans-serif"
			style:font-variation-settings={current.variation ?? 'normal'}
			style:font-feature-settings={current.features ?? 'normal'}
			style:font-weight={fontWeight}
		>
			{#each fontWeights as weight (weight.value)}
				<option value={weight.value}>{weight.label}</option>
			{/each}
		</select>
	</label>
</div>

<style>
	.type-controls {
		--trigger-size: 3.4rem;
		position: fixed;
		top: calc(1.25rem + (var(--trigger-size) + 0.75rem) * 2);
		right: 1.25rem;
		z-index: 50;
		display: grid;
		grid-template-columns: minmax(9.5rem, 1fr) minmax(7.5rem, 0.85fr);
		gap: 0.5rem;
		view-transition-name: font-picker;
	}

	.field {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
	}

	.label {
		font-size: 0.75rem;
		font-weight: var(--font-weight);
		color: var(--color-text);
		opacity: 0.45;
	}

	select {
		width: 100%;
		appearance: none;
		padding: 0.55rem 2rem 0.55rem 0.75rem;
		border: 1.5px solid color-mix(in srgb, var(--color-text) 22%, transparent);
		border-radius: 0.55rem;
		background-color: color-mix(in srgb, var(--color-bg) 92%, var(--color-text));
		background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
			linear-gradient(135deg, currentColor 50%, transparent 50%);
		background-position:
			calc(100% - 1.05rem) 55%,
			calc(100% - 0.7rem) 55%;
		background-size:
			0.35rem 0.35rem,
			0.35rem 0.35rem;
		background-repeat: no-repeat;
		color: var(--color-text);
		font-size: 0.9rem;
		line-height: 1.2;
		box-shadow: 0 8px 20px rgb(0 0 0 / 0.12);
		cursor: pointer;
	}

	select:hover {
		border-color: color-mix(in srgb, var(--color-text) 40%, transparent);
	}

	select:focus-visible {
		outline: 2px solid var(--color-accent, #1a73e8);
		outline-offset: 2px;
	}

	@media (max-width: 600px) {
		.type-controls {
			--trigger-size: 3rem;
			top: calc(0.9rem + (var(--trigger-size) + 0.65rem) * 2);
			right: 0.9rem;
			grid-template-columns: 1fr;
			min-width: 10.5rem;
		}
	}
</style>
