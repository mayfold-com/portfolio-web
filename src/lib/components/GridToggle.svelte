<script lang="ts">
	import { browser } from '$app/environment';

	const storageKey = 'naim-grid';
	const columns = 8;

	let visible = $state(false);

	$effect(() => {
		if (!browser) return;
		visible = localStorage.getItem(storageKey) === '1';
	});

	function toggle() {
		visible = !visible;
		localStorage.setItem(storageKey, visible ? '1' : '0');
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'g' || event.key === 'G') {
			const target = event.target as HTMLElement | null;
			if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
			toggle();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<button
	type="button"
	class="trigger"
	class:active={visible}
	aria-label={visible ? 'Hide layout grid' : 'Show layout grid'}
	aria-pressed={visible}
	onclick={toggle}
>
	<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
		<rect x="3" y="3" width="4.5" height="18" rx="0.6" />
		<rect x="9.75" y="3" width="4.5" height="18" rx="0.6" />
		<rect x="16.5" y="3" width="4.5" height="18" rx="0.6" />
	</svg>
</button>

{#if visible}
	<div class="grid-overlay" aria-hidden="true">
		{#each Array(columns) as _, i (i)}
			<span class="col"></span>
		{/each}
	</div>
{/if}

<style>
	.trigger {
		--trigger-size: 3.4rem;
		position: fixed;
		top: calc(1.25rem + var(--trigger-size) + 0.75rem);
		right: 1.25rem;
		z-index: 91;
		display: grid;
		place-items: center;
		width: var(--trigger-size);
		height: var(--trigger-size);
		padding: 0;
		border: 3px solid color-mix(in srgb, var(--color-text) 28%, transparent);
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-bg) 92%, var(--color-text));
		color: var(--color-text);
		box-shadow: 0 8px 20px rgb(0 0 0 / 0.16);
		cursor: pointer;
		view-transition-name: grid-toggle;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease,
			border-color 180ms ease,
			background-color 180ms ease,
			color 180ms ease;
	}

	.trigger:hover {
		transform: scale(1.04);
		box-shadow: 0 8px 22px rgb(0 0 0 / 0.18);
	}

	.trigger:focus-visible {
		outline: 2px solid var(--color-accent, #1a73e8);
		outline-offset: 3px;
	}

	.trigger.active {
		border-color: var(--color-accent, #1a73e8);
		background: var(--color-text);
		color: var(--color-bg);
	}

	.icon {
		width: 1.35rem;
		height: 1.35rem;
		fill: currentColor;
	}

	.grid-overlay {
		position: fixed;
		top: 0;
		bottom: 0;
		left: var(--grid-offset);
		/* Above project sheet (80/81) so columns stay visible while a card is open. */
		z-index: 90;
		display: grid;
		width: var(--grid-width);
		grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
		column-gap: var(--grid-gap);
		padding-inline: var(--grid-pad);
		pointer-events: none;
		box-sizing: border-box;
	}

	.col {
		background: rgb(140 55 45 / 0.2);
	}

	@media (max-width: 600px) {
		.trigger {
			--trigger-size: 3rem;
			top: calc(0.9rem + var(--trigger-size) + 0.65rem);
			right: 0.9rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.trigger {
			transition: none;
		}
	}
</style>
