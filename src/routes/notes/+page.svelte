<script lang="ts">
	import NotesList from '$lib/components/NotesList.svelte';
</script>

<svelte:head>
	<title>Notes — Naim Chayata</title>
</svelte:head>

<main class="page">
	<h1 class="title">Notes</h1>
	<NotesList />
</main>

<style>
	.page {
		width: min(100%, var(--content-span));
		padding: 0 var(--page-pad) var(--page-pad);
		padding-left: 0;
	}

	.title {
		margin: var(--page-title-space) 0 clamp(2.75rem, 7vw, 4rem);
		font-size: var(--page-title-size);
		font-weight: var(--font-weight);
		line-height: 1.15;
		letter-spacing: -0.03em;
		width: fit-content;
	}

	@media (max-width: 800px) {
		.page {
			width: 100%;
			padding: 0 var(--page-pad) var(--page-pad);
		}
	}
</style>
