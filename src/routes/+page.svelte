<script lang="ts">
	import MagneticCard from '$lib/components/MagneticCard.svelte';
	import MagneticPill from '$lib/components/MagneticPill.svelte';
	import { craftNotes, elsewhere, profile, roles, testimonials, workProjects } from '$lib/data';
	import { openProject, openProjectId } from '$lib/projectSheet';

	const featured = workProjects.slice(0, 4);
	const featuredLeft = featured.filter((_, index) => index % 2 === 0);
	const featuredRight = featured.filter((_, index) => index % 2 === 1);
	const experience = roles.slice(0, 4);
	let activeId = $state<string | null>(null);

	$effect(() => {
		const unsubscribe = openProjectId.subscribe((value) => {
			activeId = value;
		});
		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Naim Chayata</title>
</svelte:head>

<main class="page">
	<header class="intro">
		<h1 class="sr-only">Naim Chayata</h1>
		<p class="bio">
			<span class="lead">
				{#each profile.bioLead as part (part.text)}
					{#if part.bold}<strong>{part.text}</strong>{:else}{part.text}{/if}
				{/each}
			</span>
			<span class="rest">
				{#each profile.bioRest as part (part.text)}
					{#if part.bold}<strong>{part.text}</strong>{:else}{part.text}{/if}
				{/each}
			</span>
		</p>

		<div class="actions">
			<MagneticPill
				variant="primary"
				href={profile.linkedin}
				target="_blank"
				rel="noopener noreferrer"
			>
				Say hi
			</MagneticPill>
			<MagneticPill variant="secondary" href="/work">View work</MagneticPill>
		</div>
	</header>

	<section class="section work" aria-label="Selected work">
		<div class="showcase">
			{#each [featuredLeft, featuredRight] as column, columnIndex (columnIndex)}
				<div class="showcase-col">
					{#each column as project (project.id)}
						<article class="showcase-item" class:lifted={activeId === project.id}>
							<MagneticCard
								data-project-id={project.id}
								size={project.cardSize ?? 'mid'}
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
						</article>
					{/each}
				</div>
			{/each}
		</div>
	</section>

	<section class="section experience" aria-labelledby="experience-title">
		<div class="section-head">
			<h2 id="experience-title" class="section-title">Experience</h2>
			<a class="section-link" href="/resume">Full resume</a>
		</div>

		<ul class="role-list">
			{#each experience as role (`${role.title}-${role.company}`)}
				<li>
					<span class="role-main">
						<span class="role-title">{role.title}</span>
						<span class="role-at"> at </span>
						<span class="role-company">{role.company}</span>
					</span>
					<span class="role-dates">{role.dates}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="section testimonials" aria-labelledby="testimonials-title">
		<h2 id="testimonials-title" class="section-title">Testimonials</h2>

		<ul class="testimonial-list">
			{#each testimonials as item (item.name)}
				<li>
					<blockquote>
						<p>“{item.quote}”</p>
						<footer>
							<span class="testimonial-name">{item.name}</span>
							<span class="testimonial-meta">{item.role} at {item.company}</span>
						</footer>
					</blockquote>
				</li>
			{/each}
		</ul>
	</section>

	<section class="section craft" aria-labelledby="craft-title">
		<div class="section-head">
			<h2 id="craft-title" class="section-title">Craft</h2>
			<a class="section-link" href="/craft">All notes</a>
		</div>

		<ul class="note-list">
			{#each craftNotes as note (note.title)}
				<li>
					<article>
						<div class="note-row">
							<h3>{note.title}</h3>
							<span class="note-meta">{note.meta}</span>
						</div>
						<p>{note.description}</p>
					</article>
				</li>
			{/each}
		</ul>
	</section>

	<section class="section elsewhere" aria-labelledby="elsewhere-title">
		<h2 id="elsewhere-title" class="section-title">Elsewhere</h2>
		<ul class="link-list">
			{#each elsewhere as item (item.platform)}
				<li>
					<a href={item.href} target="_blank" rel="noopener noreferrer">
						<span class="link-label">{item.label}</span>
						<span class="link-platform">{item.platform}</span>
						<span class="link-arrow" aria-hidden="true">↗</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="section contact" aria-labelledby="contact-title">
		<h2 id="contact-title" class="section-title">Contact</h2>
		<p class="contact-copy">
			Based in {profile.location}. Open to thoughtful conversations about product, design systems,
			and building with AI.
		</p>
		<div class="actions">
			<MagneticPill
				variant="primary"
				href={profile.linkedin}
				target="_blank"
				rel="noopener noreferrer"
			>
				Say hi on LinkedIn
			</MagneticPill>
		</div>
	</section>
</main>

<style>
	.page {
		width: min(100%, var(--content-span));
		padding: 0 var(--page-pad) clamp(4rem, 10vw, 7rem);
		padding-left: 0;
	}

	.intro {
		margin: var(--page-title-space) 0 160px;
		max-width: 36rem;
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

	.bio {
		margin: 0;
		font-size: clamp(1.05rem, 1.7vw, 1.2rem);
		line-height: 1.55;
	}

	.lead {
		color: var(--color-text);
	}

	.lead strong {
		font-weight: var(--font-weight);
	}

	.rest {
		color: var(--color-text);
		opacity: 0.4;
	}

	.rest::before {
		content: ' ';
	}

	.rest strong {
		font-weight: var(--font-weight);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 1.75rem;
	}

	.section {
		display: grid;
		gap: 20px;
		width: 100%;
	}

	.section + .section {
		margin-top: 160px;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 20px;
	}

	.section-title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: var(--font-weight);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	.section-link {
		font-size: 0.9rem;
		color: var(--color-muted);
		text-decoration: none;
		text-underline-offset: 0.15em;
	}

	.section-link:hover {
		color: var(--color-text);
		text-decoration: underline;
	}

	.showcase {
		/* Pinterest mosaic: two independent stacks, 3 grid cols each */
		display: grid;
		grid-template-columns: var(--span-3) var(--span-3);
		column-gap: var(--grid-gap);
		align-items: start;
		width: max-content;
		max-width: 100%;
	}

	.showcase-col {
		display: flex;
		flex-direction: column;
		gap: 2.75rem;
		min-width: 0;
	}

	.showcase-col,
	.showcase-item {
		overflow: visible;
	}

	.showcase-item {
		width: 100%;
		transition: opacity 220ms ease;
	}

	.showcase:has(.showcase-item:hover) .showcase-item:not(:hover) {
		opacity: 0.28;
	}

	.showcase-item.lifted {
		pointer-events: none;
	}

	.role-list,
	.note-list,
	.link-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 20px;
		max-width: 40rem;
	}

	.role-list li {
		display: grid;
		gap: 0.25rem;
	}

	.role-main {
		font-size: 1.05rem;
		line-height: 1.35;
	}

	.role-title,
	.role-company {
		font-weight: var(--font-weight);
	}

	.role-at {
		color: var(--color-muted);
		font-weight: var(--font-weight);
	}

	.role-dates {
		color: var(--color-muted);
		font-size: 0.9rem;
	}

	.testimonial-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 2.5rem;
		max-width: 40rem;
	}

	.testimonial-list blockquote {
		margin: 0;
	}

	.testimonial-list p {
		margin: 0 0 0.85rem;
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--color-text);
	}

	.testimonial-list footer {
		display: grid;
		gap: 0.15rem;
	}

	.testimonial-name {
		font-size: 0.95rem;
		font-weight: var(--font-weight);
		line-height: 1.35;
	}

	.testimonial-meta {
		font-size: 0.9rem;
		color: var(--color-muted);
		line-height: 1.4;
	}

	.note-row {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		margin-bottom: 0.35rem;
	}

	.note-list h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: var(--font-weight);
		line-height: 1.3;
	}

	.note-meta {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.note-list p {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.link-list a {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.5rem;
		color: inherit;
		text-decoration: none;
	}

	.link-list a:hover {
		text-decoration: none;
	}

	.link-list a:hover .link-platform {
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.link-label {
		color: var(--color-muted);
	}

	.link-platform {
		font-weight: var(--font-weight);
	}

	.link-arrow {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.contact-copy {
		margin: 0;
		max-width: 28rem;
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--color-muted);
	}

	.contact .actions {
		margin-top: 0;
	}

	@media (max-width: 800px) {
		.showcase {
			width: 100%;
			grid-template-columns: 1fr;
		}
	}

</style>
