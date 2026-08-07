<script lang="ts">
	import { craftNotes } from '$lib/data';
</script>

<svelte:head>
	<title>Craft — Naim Chayata</title>
</svelte:head>

<main class="page">
	<h1 class="title">Craft</h1>

	<ul class="list">
		{#each craftNotes as note (note.title)}
			<li>
				<article>
					<div class="row">
						<h2>{note.title}</h2>
						<span class="meta">{note.meta}</span>
					</div>
					<p>{note.description}</p>
				</article>
			</li>
		{/each}
	</ul>

	<div class="canvas" aria-hidden="true"></div>
</main>

<style>
	.page {
		max-width: var(--page-max);
		padding: 0 var(--page-pad) var(--page-pad);
		padding-left: 0;
	}

	@media (max-width: 800px) {
		.page {
			width: 100%;
			max-width: none;
			padding: 0 var(--page-pad) var(--page-pad);
		}
	}

	.title {
		margin: var(--page-title-space) 0;
		font-size: var(--page-title-size);
		font-weight: var(--font-weight);
		line-height: 1.15;
		letter-spacing: -0.03em;
		width: fit-content;
	}

	.list {
		margin: 0 0 clamp(2.5rem, 6vw, 4rem);
		padding: 0;
		list-style: none;
		display: grid;
		gap: 1.5rem;
		max-width: 40rem;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.35rem;
	}

	h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: var(--font-weight);
	}

	.meta {
		color: var(--color-muted);
		font-size: 0.875rem;
	}

	p {
		margin: 0;
		color: var(--color-muted);
	}

	.canvas {
		width: min(100%, 52rem);
		aspect-ratio: 2.2 / 1;
		background: color-mix(in srgb, var(--color-text) 14%, var(--color-bg));
		border-radius: 0.15rem;
	}
</style>
