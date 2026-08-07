<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import FontPicker from '$lib/components/FontPicker.svelte';
	import GridToggle from '$lib/components/GridToggle.svelte';
	import MotionPicker from '$lib/components/MotionPicker.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import ProjectSheet from '$lib/components/ProjectSheet.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { fontshareStylesheetHref, fontsStylesheetHref } from '$lib/fonts';
	import { preparePageTransition } from '$lib/transitions';
	import '../app.css';
	import '$lib/local-fonts.css';

	let { children } = $props();

	preparePageTransition();
</script>

<svelte:head>
	<title>Naim Chayata</title>
	<meta
		name="description"
		content="Naim Chayata — product builder and designer. Founder of Mayfold, formerly UX Manager at Adyen."
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

<ProjectSheet />
<ThemePicker />
<GridToggle />
<FontPicker />
<MotionPicker />

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
			position: sticky;
			width: 100%;
			height: auto;
			padding-bottom: 0.5rem;
			background: color-mix(in srgb, var(--color-bg) 92%, transparent);
			backdrop-filter: blur(10px);
		}

		.main {
			margin-left: 0;
		}
	}
</style>
