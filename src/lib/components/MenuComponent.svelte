<script lang="ts">
	type MenuItem =
		| { kind: 'action'; label: string; danger?: boolean }
		| { kind: 'divider' };

	const items: MenuItem[] = [
		{ kind: 'action', label: 'Edit' },
		{ kind: 'action', label: 'Duplicate' },
		{ kind: 'action', label: 'Move' },
		{ kind: 'action', label: 'Delete', danger: true },
		{ kind: 'divider' },
		{ kind: 'action', label: 'Properties' },
		{ kind: 'action', label: 'Help' }
	];

	let lastAction = $state<string | null>(null);
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	function onAction(label: string) {
		lastAction = label;
		clearTimeout(clearTimer);
		clearTimer = setTimeout(() => {
			if (lastAction === label) lastAction = null;
		}, 900);
	}
</script>

<div class="menu menu-demo" role="menu" aria-label="Example menu">
	{#each items as item, index (item.kind === 'divider' ? `d-${index}` : item.label)}
		{#if item.kind === 'divider'}
			<div class="divider" role="separator"></div>
		{:else}
			<button
				type="button"
				class="item"
				class:danger={item.danger}
				class:flash={lastAction === item.label}
				role="menuitem"
				onclick={() => onAction(item.label)}
			>
				{item.label}
			</button>
		{/if}
	{/each}
</div>

<style>
	.menu {
		--menu-text: #394962;
		--menu-hover: #f3f6f9;
		--menu-divider: #dce0e5;
		--menu-danger: #e11d2e;
		box-sizing: border-box;
		width: calc(184px + 16px);
		padding: 8px;
		border-radius: 12px;
		background: #fff;
		color: var(--menu-text);
		font-family: inherit;
		font-size: 14px;
		line-height: 1;
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.04),
			0 8px 24px rgb(0 0 0 / 0.1);
	}

	.item {
		appearance: none;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		width: 184px;
		height: 32px;
		margin: 0;
		padding: 0 12px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 14px;
		line-height: 1;
		letter-spacing: -0.01em;
		text-align: left;
		cursor: pointer;
		transition:
			background-color 120ms ease,
			color 120ms ease;
	}

	.item:hover,
	.item:focus-visible {
		background: var(--menu-hover);
		outline: none;
	}

	.item.flash {
		background: var(--menu-hover);
	}

	.item.danger {
		color: var(--menu-danger);
	}

	.divider {
		height: 1px;
		width: 184px;
		margin: 4px 0;
		background: var(--menu-divider);
	}
</style>
