<script lang="ts">
	import { browser } from '$app/environment';
	import {
		applyTheme,
		defaultThemeId,
		getTheme,
		isThemeId,
		themeStorageKey,
		themes,
		type ThemeId
	} from '$lib/themes';

	let themeId = $state<ThemeId>(defaultThemeId);
	const current = $derived(getTheme(themeId));

	$effect(() => {
		if (!browser) return;

		const stored = localStorage.getItem(themeStorageKey);
		const initial = isThemeId(stored) ? stored : defaultThemeId;
		themeId = initial;
		applyTheme(initial);
	});

	function onChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (!isThemeId(value)) return;

		themeId = value;
		applyTheme(value);
		localStorage.setItem(themeStorageKey, value);
	}
</script>

<label class="theme-picker">
	<span class="label">Color</span>
	<span class="control">
		<span class="swatch" style:background={current.swatch} aria-hidden="true"></span>
		<select aria-label="Choose color scheme" value={themeId} onchange={onChange}>
			{#each themes as theme (theme.id)}
				<option value={theme.id}>{theme.label}</option>
			{/each}
		</select>
	</span>
</label>

<style>
	.theme-picker {
		--trigger-size: 3.4rem;
		position: fixed;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 50;
		display: grid;
		gap: 0.3rem;
		min-width: 9.5rem;
		view-transition-name: theme-picker;
	}

	.label {
		font-size: 0.75rem;
		font-weight: var(--font-weight);
		color: var(--color-text);
		opacity: 0.45;
	}

	.control {
		position: relative;
		display: block;
		min-width: 0;
	}

	.swatch {
		position: absolute;
		top: 50%;
		left: 0.7rem;
		z-index: 1;
		width: 0.85rem;
		height: 0.85rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 28%, transparent);
		border-radius: 999px;
		transform: translateY(-50%);
		pointer-events: none;
	}

	select {
		width: 100%;
		appearance: none;
		padding: 0.55rem 2rem 0.55rem 2rem;
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
		.theme-picker {
			top: 0.9rem;
			right: 0.9rem;
			min-width: 8.5rem;
		}
	}
</style>
