<script lang="ts">
	import { page } from '$app/state';
	import { mobileNavItems } from '$lib/data';

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<nav class="mobile-nav" aria-label="Primary">
	{#each mobileNavItems as item (item.href)}
		{@const active = isActive(item.href)}
		<a
			class="item"
			class:current={active}
			href={item.href}
			aria-current={active ? 'page' : undefined}
		>
			{item.label}
		</a>
	{/each}
</nav>

<style>
	.mobile-nav {
		display: none;
	}

	@media (max-width: 800px) {
		.mobile-nav {
			position: fixed;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 30;
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			align-items: stretch;
			min-height: calc(3.5rem + env(safe-area-inset-bottom, 0px));
			padding: 0 var(--page-pad) env(safe-area-inset-bottom, 0px);
			border-top: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
			background: color-mix(in srgb, var(--color-bg) 88%, transparent);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
		}

		.item {
			display: grid;
			place-items: center;
			min-height: 3.5rem;
			color: var(--color-text);
			opacity: 0.4;
			font-size: 15px;
			font-weight: var(--font-weight, 500);
			line-height: 1.2;
			text-decoration: none;
		}

		.item.current {
			opacity: 1;
		}

		.item:hover {
			text-decoration: none;
		}
	}
</style>
