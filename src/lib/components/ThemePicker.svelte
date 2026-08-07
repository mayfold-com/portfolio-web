<script lang="ts">
	import { browser } from '$app/environment';
	import {
		applyTheme,
		defaultThemeId,
		isThemeId,
		themeStorageKey,
		themes,
		type ThemeId
	} from '$lib/themes';

	let open = $state(false);
	let themeId = $state<ThemeId>(defaultThemeId);
	let rootEl: HTMLDivElement | undefined = $state();

	// Fan opens toward the page (left + down) from the top-right corner.
	// CSS angles are clockwise from the positive X axis.
	const angles = [180, 160, 140, 120, 100, 80];

	$effect(() => {
		if (!browser) return;

		const stored = localStorage.getItem(themeStorageKey);
		const initial = isThemeId(stored) ? stored : defaultThemeId;
		themeId = initial;
		applyTheme(initial);
	});

	function selectTheme(id: ThemeId) {
		themeId = id;
		applyTheme(id);
		localStorage.setItem(themeStorageKey, id);
		open = false;
	}

	function toggle() {
		open = !open;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (!open || !rootEl) return;
		if (!rootEl.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} onpointerdown={onWindowPointerDown} />

<div class="theme-picker" class:open bind:this={rootEl}>
	<div class="swatches" role="listbox" aria-label="Color schemes" aria-hidden={!open}>
		{#each themes as theme, index (theme.id)}
			<button
				type="button"
				class="swatch"
				class:active={themeId === theme.id}
				style:--angle="{angles[index]}deg"
				style:--swatch={theme.swatch}
				style:--delay="{index * 35}ms"
				role="option"
				aria-selected={themeId === theme.id}
				aria-label={theme.label}
				tabindex={open ? 0 : -1}
				onclick={() => selectTheme(theme.id)}
			></button>
		{/each}
	</div>

	<button
		type="button"
		class="trigger"
		aria-label="Choose color scheme"
		aria-expanded={open}
		aria-haspopup="listbox"
		onclick={toggle}
	>
		<svg class="icon" viewBox="0 0 32 32" aria-hidden="true">
			<path
				d="M16 3.5C9.1 3.5 3.5 8.6 3.5 14.9c0 3.8 2.1 7.1 5.3 9 .5.3.9-.1.8-.6l-.2-1.6c-.1-3.6 2.8-6.6 6.4-6.6h.7c5.4 0 9.8-4.1 9.8-9.1C26.3 5.4 21.7 3.5 16 3.5z"
			/>
			<circle cx="10.2" cy="12.2" r="1.55" fill="var(--dot-1, #5b2c6f)" />
			<circle cx="14.4" cy="8.8" r="1.55" fill="var(--dot-2, #3f7d4e)" />
			<circle cx="19.4" cy="8.9" r="1.55" fill="var(--dot-3, #1a73e8)" />
			<circle cx="22.4" cy="12.8" r="1.55" fill="var(--dot-4, #c4b59a)" />
			<circle cx="12.2" cy="16.4" r="1.55" fill="var(--dot-5, #222222)" />
		</svg>
	</button>
</div>

<style>
	.theme-picker {
		--trigger-size: 3.4rem;
		--swatch-size: 2.05rem;
		--radius: 4.45rem;
		position: fixed;
		top: 1.25rem;
		right: 1.25rem;
		z-index: 50;
		width: var(--trigger-size);
		height: var(--trigger-size);
		view-transition-name: theme-picker;
	}

	.trigger {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		width: var(--trigger-size);
		height: var(--trigger-size);
		padding: 0;
		border: 3px solid #1a73e8;
		border-radius: 50%;
		background: #ececec;
		color: #111111;
		box-shadow: 0 8px 20px rgb(0 0 0 / 0.16);
		cursor: pointer;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease,
			border-color 180ms ease,
			background-color 180ms ease;
	}

	.trigger:hover {
		transform: scale(1.04);
		box-shadow: 0 8px 22px rgb(0 0 0 / 0.18);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-accent, #1a73e8);
		outline-offset: 3px;
	}

	.icon {
		width: 1.55rem;
		height: 1.55rem;
	}

	.icon path {
		fill: currentColor;
	}

	.swatches {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.swatch {
		position: absolute;
		top: 50%;
		left: 50%;
		width: var(--swatch-size);
		height: var(--swatch-size);
		margin: calc(var(--swatch-size) / -2) 0 0 calc(var(--swatch-size) / -2);
		padding: 0;
		border: 1.5px solid rgb(0 0 0 / 0.12);
		border-radius: 50%;
		background: var(--swatch);
		box-shadow: 0 3px 10px rgb(0 0 0 / 0.12);
		cursor: pointer;
		opacity: 0;
		transform: rotate(var(--angle)) translate(0) rotate(calc(-1 * var(--angle))) scale(0.4);
		transition:
			transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 180ms ease,
			box-shadow 180ms ease;
		transition-delay: 0ms;
		pointer-events: none;
	}

	.theme-picker.open .swatch {
		opacity: 1;
		transform: rotate(var(--angle)) translate(var(--radius)) rotate(calc(-1 * var(--angle)))
			scale(1);
		transition-delay: var(--delay);
		pointer-events: auto;
	}

	.swatch:hover {
		box-shadow: 0 5px 14px rgb(0 0 0 / 0.2);
	}

	.swatch:focus-visible {
		outline: 2px solid var(--color-text);
		outline-offset: 2px;
	}

	.swatch.active {
		box-shadow:
			0 0 0 2px var(--color-bg),
			0 0 0 4px var(--color-text),
			0 5px 14px rgb(0 0 0 / 0.18);
	}

	@media (max-width: 600px) {
		.theme-picker {
			--trigger-size: 3rem;
			--swatch-size: 1.9rem;
			--radius: 3.9rem;
			top: 0.9rem;
			right: 0.9rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trigger,
		.swatch {
			transition: none;
		}
	}
</style>
