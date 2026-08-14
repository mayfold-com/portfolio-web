<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		title: string;
		date: string;
		datetime: string;
		summary?: string;
		lifted?: boolean;
	};

	let {
		title,
		date,
		datetime,
		summary = '',
		lifted = false,
		class: className = '',
		...rest
	}: Props = $props();
</script>

<button type="button" class="row {className}" class:lifted {...rest}>
	<span class="copy">
		<span class="heading">
			<span class="title" data-note-origin>{title}</span>
		</span>
		{#if summary}
			<span class="summary">{summary}</span>
		{/if}
	</span>
	<time class="date" {datetime}>{date}</time>
</button>

<style>
	.row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.25rem;
		width: 100%;
		margin: 0;
		padding: 0.7rem 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-family: var(--font);
		font-variation-settings: var(--font-variation, normal);
		font-feature-settings: var(--font-features, normal);
		font-weight: var(--font-weight, 400);
		text-align: left;
		cursor: pointer;
		user-select: none;
	}

	.row:focus {
		outline: none;
	}

	.row:focus-visible {
		outline: 2px solid #5b9dd9;
		outline-offset: 3px;
	}

	.copy {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
		min-width: 0;
	}

	.heading {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		min-width: 0;
		transition: opacity 220ms ease;
	}

	.title {
		font-size: 15px;
		font-weight: var(--font-weight);
		line-height: 1.35;
	}

	.summary,
	.date {
		font-size: 15px;
		font-weight: var(--font-weight, 500);
		line-height: 1.35;
		color: var(--color-text);
		opacity: 0.4;
		transition: opacity 220ms ease;
	}

	.summary {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.date {
		flex: 0 0 auto;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.row:hover .date,
	.row:focus-visible .date {
		opacity: 1;
	}

	.row.lifted {
		pointer-events: none;
	}

	.row.lifted .title {
		opacity: 0;
	}
</style>
