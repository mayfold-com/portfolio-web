<script lang="ts">
	import { profile, roles } from '$lib/data';
</script>

<svelte:head>
	<title>Resume — Naim Chayata</title>
</svelte:head>

<main class="page">
	<h1 class="title">Resume</h1>

	<section aria-labelledby="roles-heading">
		<h2 id="roles-heading" class="sr-only">Roles</h2>
		<ul class="roles">
			{#each roles as role (`${role.title}-${role.company}-${role.dates}`)}
				<li>
					<span class="dates">{role.dates}</span>
					<p class="headline">
						<span class="role">{role.title}</span>
						<span class="at"> at </span>
						<span class="company">{role.company}</span>
					</p>
					<p class="item-description">{role.description}</p>
					{#if role.cards}
						<div class="cards" aria-hidden="true">
							{#each Array(role.cards) as _, i (i)}
								<div class="card"></div>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="earlier">
			<a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
				More detail on LinkedIn
				<span class="external" aria-hidden="true">↗</span>
			</a>
		</p>
	</section>
</main>

<style>
	.page {
		/* Columns 3–6; 7–8 stay empty */
		width: var(--span-4);
		max-width: 100%;
		padding: 0 0 var(--page-pad);
	}

	.title {
		margin: var(--page-title-space) 0;
		font-size: clamp(2.75rem, 7vw, 5rem);
		font-weight: var(--font-weight);
		line-height: 0.95;
		width: fit-content;
		max-width: 100%;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.roles {
		margin: 0;
		padding: 0;
		list-style: none;
		width: 100%;
	}

	.roles li + li {
		margin-top: 2.75rem;
	}

	.dates {
		display: block;
		margin: 0 0 0.35rem;
		color: var(--color-text);
		opacity: 0.4;
		font-size: 1rem;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
	}

	.headline {
		margin: 0;
		font-size: 20px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		color: var(--color-text);
	}

	.role {
		color: var(--color-text);
	}

	.at,
	.item-description {
		color: var(--color-text);
		opacity: 0.4;
	}

	.item-description {
		margin: 0.35rem 0 0;
		max-width: 100%;
		font-size: 20px;
		font-weight: var(--font-weight, 500);
		line-height: 1.45;
	}

	.cards {
		/* Two cards × two columns across cols 3–6 */
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--grid-gap);
		margin-top: 1.25rem;
		width: 100%;
	}

	.card {
		aspect-ratio: 4 / 3;
		border-radius: 1.1rem;
		background: color-mix(in srgb, var(--color-text) 12%, var(--color-bg));
	}

	@media (max-width: 800px) {
		.page {
			width: 100%;
			padding: 0 var(--page-pad) var(--page-pad);
		}
	}

	@media (max-width: 600px) {
		.cards {
			grid-template-columns: 1fr;
		}
	}

	.earlier {
		margin: 3rem 0 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.earlier a {
		color: var(--color-muted);
		text-decoration: none;
	}

	.earlier a:hover {
		color: var(--color-text);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.external {
		margin-left: 0.2em;
	}
</style>
