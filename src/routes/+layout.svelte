<script lang="ts">
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import GridToggle from '$lib/components/GridToggle.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import NoteSheet from '$lib/components/NoteSheet.svelte';
	import ProjectSheet from '$lib/components/ProjectSheet.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import {
		applyFont,
		applyFontWeight,
		defaultFontId,
		defaultFontWeight,
		fontshareStylesheetHref,
		fontsStylesheetHref
	} from '$lib/fonts';
	import { preparePageTransition } from '$lib/transitions';
	import '../app.css';
	import '$lib/local-fonts.css';

	let { children } = $props();

	const isDev = import.meta.env.DEV;

	preparePageTransition();

	$effect(() => {
		if (!browser) return;
		applyFont(defaultFontId);
		applyFontWeight(defaultFontWeight);
	});
</script>

<svelte:head>
	<title>Naim Chayata</title>
	<meta
		name="description"
		content="Naim Chayata — design leader. Formerly UX Manager at Adyen. Building products of his own."
	/>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href={fontsStylesheetHref} rel="stylesheet" />
	<link href={fontshareStylesheetHref} rel="stylesheet" />
</svelte:head>

<div class="shell">
	<aside class="sidebar">
		<Nav />
	</aside>

	<div class="main">
		<div class="content">
			{@render children()}
		</div>
	</div>
</div>

<MobileNav />
<ProjectSheet />
<NoteSheet />
{#if isDev}
	<ThemePicker />
	<GridToggle />
{/if}

<style>
	.shell {
		min-height: 100vh;
	}

	.sidebar {
		position: fixed;
		top: 0;
		left: calc(var(--grid-offset) + var(--grid-pad));
		z-index: 20;
		width: var(--sidebar-width);
		height: 100vh;
		padding: var(--page-pad) 0 0;
		pointer-events: none;
	}

	.sidebar :global(nav) {
		pointer-events: auto;
	}

	.main {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		margin-left: var(--content-start);
	}

	.content {
		flex: 1;
		view-transition-name: page-content;
	}

	@media (max-width: 800px) {
		.sidebar {
			display: none;
		}

		.main {
			margin-left: 0;
			width: 100%;
			padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px));
		}

		.content {
			width: 100%;
		}
	}
</style>
