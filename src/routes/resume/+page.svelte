<script lang="ts">
	import { additionalRoles, profile, roles } from '$lib/data';
</script>

<svelte:head>
	<title>Resume — Naim Chayata</title>
</svelte:head>

<main class="page">
	<h1 class="title">Resume</h1>

	<section aria-labelledby="roles-heading">
		<h2 id="roles-heading" class="section-title">Experience</h2>
		<ul class="roles">
			{#each roles as role (`${role.title}-${role.company}-${role.dates}`)}
				<li>
					<p class="headline">
						<span class="role">{role.title}</span>
						<span class="at"> @ </span>
						<span class="company">{role.company}</span>
					</p>
					<span class="dates">{role.dates}</span>
					<p class="item-description">{role.description}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="block" aria-labelledby="additional-heading">
		<h2 id="additional-heading" class="section-title">Additional experience</h2>
		<ul class="roles compact">
			{#each additionalRoles as role (`${role.title}-${role.company}-${role.dates}`)}
				<li>
					<p class="headline">
						<span class="role">{role.title}</span>
						<span class="at"> @ </span>
						<span class="company">{role.company}</span>
					</p>
					<span class="dates">{role.dates}</span>
					<p class="item-description">{role.description}</p>
				</li>
			{/each}
		</ul>
	</section>

	<p class="earlier">
		<a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
			More detail on LinkedIn
			<span class="external" aria-hidden="true">↗</span>
		</a>
	</p>
</main>

<style>
	.page {
		width: min(100%, var(--content-span));
		padding: 0 var(--page-pad) var(--page-pad);
		padding-left: 0;
		container-type: inline-size;
	}

	.title {
		margin: var(--page-title-space) 0 clamp(2.75rem, 7vw, 4rem);
		font-size: var(--page-title-size);
		font-weight: var(--font-weight);
		line-height: 1.15;
		letter-spacing: -0.03em;
		width: fit-content;
		max-width: 100%;
	}

	.section-title {
		margin: 0 0 1.5rem;
		font-size: clamp(1.15rem, 2vw, 1.35rem);
		font-weight: var(--font-weight);
		line-height: 1.25;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}

	.block {
		margin-top: 3.25rem;
		width: min(100%, var(--span-4));
	}

	.roles {
		margin: 0;
		padding: 0;
		list-style: none;
		width: min(100%, var(--span-4));
	}

	.roles li + li {
		margin-top: 2.75rem;
	}

	.roles.compact li + li {
		margin-top: 1.75rem;
	}

	.headline {
		margin: 0;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		color: var(--color-text);
	}

	.role,
	.company {
		color: var(--color-text);
	}

	.at {
		color: var(--color-text);
		opacity: 0.4;
	}

	.dates {
		display: block;
		margin: 0.35rem 0 0;
		color: var(--color-text);
		opacity: 0.4;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
	}

	.item-description {
		margin: 0.5rem 0 0;
		max-width: 100%;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.55;
		color: var(--color-body);
	}

	@media (max-width: 800px) {
		.page {
			width: 100%;
			padding: 0 var(--page-pad) var(--page-pad);
		}
	}

	.earlier {
		margin: 3rem 0 0;
		font-size: 0.875rem;
		line-height: 1.5;
		width: min(100%, var(--span-4));
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
