<script lang="ts">
	import NoteRow from '$lib/components/NoteRow.svelte';
	import { noteDateParts, notes } from '$lib/data';
	import { openNote, openNoteId } from '$lib/noteSheet';

	const rows = notes.toSorted((a, b) => b.date.localeCompare(a.date));
	const groups = rows.reduce<{ year: string; notes: typeof rows }[]>((list, note) => {
		const { year } = noteDateParts(note.date);
		const last = list.at(-1);
		if (!last || last.year !== year) list.push({ year, notes: [note] });
		else last.notes.push(note);
		return list;
	}, []);

	let activeNoteId = $state<string | null>(null);
	let hoveredYear = $state<string | null>(null);
	let yearY = $state<Record<string, number>>({});

	function moveYear(year: string, row: HTMLElement) {
		hoveredYear = year;
		yearY[year] = row.offsetTop;
	}

	function resetYear(year: string) {
		yearY[year] = 0;
	}

	$effect(() => {
		const unsubscribe = openNoteId.subscribe((value) => {
			activeNoteId = value;
		});
		return unsubscribe;
	});
</script>

<ul
	class="list"
	onmouseleave={() => {
		hoveredYear = null;
	}}
>
	{#each groups as group (group.year)}
		<li
			class="group"
			onmouseleave={() => {
				resetYear(group.year);
			}}
		>
			<span
				class="year"
				class:hot={hoveredYear === group.year}
				style:transform="translate3d(0, {yearY[group.year] ?? 0}px, 0)"
			>
				{group.year}
			</span>

			<ul class="rows">
				{#each group.notes as note (note.slug)}
					{@const { dayMonth } = noteDateParts(note.date)}
					<li
						class:lifted={activeNoteId === note.slug}
						onmouseenter={(event) => {
							moveYear(group.year, event.currentTarget);
						}}
						onfocusin={(event) => {
							moveYear(group.year, event.currentTarget);
						}}
					>
						<NoteRow
							data-note-id={note.slug}
							title={note.title}
							summary={note.description}
							date={dayMonth}
							datetime={note.date}
							lifted={activeNoteId === note.slug}
							aria-label="Open note: {note.title}"
							onclick={() => {
								openNote(note.slug);
							}}
						/>
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>

<style>
	.list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.group {
		position: relative;
		padding-left: 5.5rem;
	}

	.year {
		position: absolute;
		top: 0;
		left: 0;
		width: 4.25rem;
		padding: 0.7rem 0;
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
		opacity: 0.4;
		pointer-events: none;
		transition:
			transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 220ms ease;
	}

	.year.hot {
		opacity: 1;
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 0;
	}

	.list:has(.rows li:hover) .rows li:not(:hover) :global(.heading),
	.list:has(.rows li:hover) .rows li:not(:hover) :global(.summary),
	.list:has(.rows li:hover) .rows li:not(:hover) :global(.date) {
		opacity: 0.28;
		transition: opacity 220ms ease;
	}

	.rows li.lifted {
		pointer-events: none;
	}

	@media (max-width: 800px) {
		.group {
			padding-left: 4.35rem;
		}

		.year {
			width: 3.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.year {
			transition: opacity 220ms ease;
		}
	}
</style>
