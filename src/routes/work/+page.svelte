<script lang="ts">
	import MagneticCard from '$lib/components/MagneticCard.svelte';
	import { workProjects } from '$lib/data';
	import { openProject, openProjectId } from '$lib/projectSheet';

	let activeId = $state<string | null>(null);

	$effect(() => {
		const unsubscribe = openProjectId.subscribe((value) => {
			activeId = value;
		});
		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Work — Naim Chayata</title>
</svelte:head>

<main class="page">
	<h1 class="title">Work</h1>

	<ul class="list">
		{#each workProjects as project (project.id)}
			<li class="item" class:lifted={activeId === project.id}>
				<MagneticCard
					data-project-id={project.id}
					size="wide"
					video={project.video}
					poster={project.poster}
					title={project.title}
					description={project.description}
					lifted={activeId === project.id}
					aria-label="Open project: {project.title}"
					onclick={(event) => {
						const origin = (event.currentTarget as HTMLElement).querySelector(
							'[data-project-origin]'
						);
						openProject(
							project.id,
							(origin as HTMLElement) ?? event.currentTarget,
							event
						);
					}}
				/>
			</li>
		{/each}
	</ul>
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

	.list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 2.75rem;
		width: var(--span-4);
		max-width: 100%;
	}

	.list,
	.item {
		overflow: visible;
	}

	.item {
		transition: opacity 220ms ease;
	}

	.list:has(.item:hover) .item:not(:hover) {
		opacity: 0.28;
	}

	.item.lifted {
		pointer-events: none;
	}

	@media (max-width: 800px) {
		.page {
			width: 100%;
			padding: 0 var(--page-pad) var(--page-pad);
		}

		.list {
			width: 100%;
		}
	}
</style>
