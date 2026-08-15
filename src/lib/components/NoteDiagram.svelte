<script lang="ts">
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';

	export type NoteDiagramKind = 'gaps' | 'benchmark' | 'tasks';

	let { kind }: { kind: NoteDiagramKind } = $props();

	const questions = ['Loading', 'Going back', 'Empty account', 'Payment fails'];
	const longTasks = [
		{ at: 0, dur: 70 },
		{ at: 18, dur: 52 },
		{ at: 38, dur: 62 }
	];
	/** Uneven on purpose, and ending where the parallel work ends. */
	const smallTasks = [
		{ at: 0, dur: 25 },
		{ at: 25, dur: 20 },
		{ at: 45, dur: 30 },
		{ at: 75, dur: 25 }
	];

	type BenchmarkMode = 'time' | 'tokens' | 'intelligence';

	/**
	 * Artificial Analysis, 15 Aug 2026.
	 * Time: end-to-end response time for a 500-token reply (includes thinking).
	 * Tokens: output tokens used to run the full Intelligence Index.
	 * Intelligence: Artificial Analysis Intelligence Index score.
	 * Rows re-sort by the selected metric.
	 * https://artificialanalysis.ai/leaderboards/models
	 */
	const models = [
		{
			name: 'GPT 5.6 Sol (medium)',
			time: 11,
			timeLabel: '11s',
			tokens: 12,
			tokenLabel: '12M',
			intelligence: 56
		},
		{
			name: 'Grok 4.5 (high)',
			time: 19,
			timeLabel: '19s',
			tokens: 60,
			tokenLabel: '60M',
			intelligence: 56,
			highlight: true
		},
		{
			name: 'Gemini 3.6 Flash',
			time: 22,
			timeLabel: '22s',
			tokens: 59,
			tokenLabel: '59M',
			intelligence: 52
		},
		{
			name: 'GPT 5.6 Sol (high)',
			time: 24,
			timeLabel: '24s',
			tokens: 21,
			tokenLabel: '21M',
			intelligence: 57
		},
		{
			name: 'Claude Opus 5 (xhigh)',
			time: 42,
			timeLabel: '42s',
			tokens: 76,
			tokenLabel: '76M',
			intelligence: 63
		},
		{
			name: 'Grok 4.6 (high)',
			time: 44,
			timeLabel: '44s',
			tokens: 72,
			tokenLabel: '72M',
			intelligence: 61
		},
		{
			name: 'GPT 5.6 Sol (xhigh)',
			time: 50,
			timeLabel: '50s',
			tokens: 35,
			tokenLabel: '35M',
			intelligence: 59
		},
		{
			name: 'Claude Opus 5 (max)',
			time: 58,
			timeLabel: '58s',
			tokens: 100,
			tokenLabel: '100M',
			intelligence: 63
		},
		{
			name: 'Kimi K3 (max)',
			time: 67,
			timeLabel: '67s',
			tokens: 130,
			tokenLabel: '130M',
			intelligence: 60
		},
		{
			name: 'Claude Sonnet 5 (max)',
			time: 142,
			timeLabel: '2m 22s',
			tokens: 300,
			tokenLabel: '300M',
			intelligence: 55
		},
		{
			name: 'GPT 5.6 Sol (max)',
			time: 150,
			timeLabel: '2m 30s',
			tokens: 70,
			tokenLabel: '70M',
			intelligence: 61
		}
	];

	let mode = $state<BenchmarkMode>('time');
	const bars = $derived(
		models
			.map((model) => {
				if (mode === 'tokens') {
					return {
						name: model.name,
						value: model.tokens,
						label: model.tokenLabel,
						highlight: model.highlight === true
					};
				}
				if (mode === 'intelligence') {
					return {
						name: model.name,
						value: model.intelligence,
						label: String(model.intelligence),
						highlight: model.highlight === true
					};
				}
				return {
					name: model.name,
					value: model.time,
					label: model.timeLabel,
					highlight: model.highlight === true
				};
			})
			.toSorted((a, b) =>
				mode === 'intelligence' ? b.value - a.value : a.value - b.value
			)
	);
	const longest = $derived(Math.max(...bars.map((bar) => bar.value)));
</script>

{#if kind === 'gaps'}
	<figure class="note-diagram">
		<div class="frame">
			<div class="between">
				<span class="screen"></span>
				<ul class="questions">
					{#each questions as question (question)}
						<li>{question}</li>
					{/each}
				</ul>
				<span class="screen"></span>
			</div>
		</div>
	</figure>
{:else if kind === 'tasks'}
	<figure
		class="note-diagram ways"
		aria-label="Two ways of working over the same time to finish. Parallel work with agents: three overlapping long tasks on separate rows. Sequential work with agents: many small tasks on a single row."
	>
		<div class="frame">
			<div class="chart labelled">
				<span class="way-label">Parallel work with agents</span>
				<ol class="rows">
					{#each longTasks as task, index (index)}
						<li class="row">
							<span class="lane">Agent {index + 1}</span>
							<span class="track">
								<span class="bar plain" style:--at={task.at} style:--dur={task.dur}></span>
							</span>
						</li>
					{/each}
				</ol>
			</div>
		</div>

		<div class="frame">
			<div class="chart labelled">
				<span class="way-label">Sequential work with agents</span>
				<ol class="rows">
					<li class="row">
						<span class="lane">Agent 1</span>
						<span class="track">
							{#each smallTasks as task (task.at)}
								<span class="bar plain" style:--at={task.at} style:--dur={task.dur}></span>
							{/each}
						</span>
					</li>
				</ol>
			</div>
		</div>
	</figure>
{:else if kind === 'benchmark'}
	<figure
		class="note-diagram"
		aria-label="Artificial Analysis comparison of the same models by time to finish, output tokens, or Intelligence Index score."
	>
		<div class="frame">
			<div class="switcher" role="tablist" aria-label="Benchmark metric">
				<button
					type="button"
					role="tab"
					class:active={mode === 'time'}
					aria-selected={mode === 'time'}
					onclick={() => (mode = 'time')}
				>
					Time to finish
				</button>
				<button
					type="button"
					role="tab"
					class:active={mode === 'tokens'}
					aria-selected={mode === 'tokens'}
					onclick={() => (mode = 'tokens')}
				>
					Output tokens
				</button>
				<button
					type="button"
					role="tab"
					class:active={mode === 'intelligence'}
					aria-selected={mode === 'intelligence'}
					onclick={() => (mode = 'intelligence')}
				>
					Intelligence
				</button>
			</div>

			<div class="chart labelled latency">
				<ol class="rows">
					{#each bars as bar (bar.name)}
						<li
							class="row"
							class:highlight={bar.highlight}
							animate:flip={{ duration: 420, easing: cubicOut }}
						>
							<span class="lane">{bar.name}</span>
							<span class="track">
								<span
									class="bar"
									style:--at="0"
									style:width={`calc(${(bar.value / longest) * 100}% - 5px)`}
								></span>
							</span>
							<span class="duration">{bar.label}</span>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</figure>
{/if}

<style>
	.note-diagram {
		width: 100%;
		margin: 2.25rem 0;
		padding: 0;
	}

	.frame {
		width: 100%;
		padding: 1.5rem 1.25rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
		box-sizing: border-box;
		/* Bars that outlast the frame are meant to run off the edge. */
		overflow: hidden;
	}

	.chart {
		position: relative;
		--label-w: 0rem;
		--row-h: 2.75rem;
	}

	.chart.labelled {
		--label-w: 6rem;
	}

	.switcher {
		display: inline-flex;
		gap: 0.2rem;
		margin-bottom: 1.15rem;
		padding: 0.2rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-text) 8%, transparent);
	}

	.switcher button {
		appearance: none;
		border: 0;
		margin: 0;
		padding: 0.45rem 0.85rem;
		border-radius: 999px;
		background: transparent;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
	}

	.switcher button.active {
		background: color-mix(in srgb, var(--color-text) 12%, transparent);
		color: var(--color-text);
	}

	.chart.latency {
		--label-w: 10.5rem;
		--time-w: 3.5rem;
		--row-h: 2.15rem;
	}

	.chart.latency .row {
		grid-template-columns: var(--label-w) minmax(0, 1fr) var(--time-w);
	}

	.chart.latency .bar {
		width: 0;
		transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.chart.latency .row.highlight .lane,
	.chart.latency .row.highlight .duration {
		color: var(--color-text);
	}

	.chart.latency .row.highlight .bar {
		background: color-mix(in srgb, var(--color-text) 28%, transparent);
	}

	.note-diagram.ways {
		display: grid;
		gap: 0.75rem;
	}

	.note-diagram.ways .chart {
		--label-w: 4.75rem;
		--row-h: 2.15rem;
	}

	.way-label {
		display: block;
		margin: 0 0 0.75rem;
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.duration {
		font-size: 0.85rem;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
		text-align: right;
		white-space: nowrap;
	}

	.rows {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.row {
		position: relative;
		display: grid;
		grid-template-columns: var(--label-w) minmax(0, 1fr);
		align-items: center;
		height: var(--row-h);
	}

	.track {
		position: relative;
		height: 100%;
	}

	/* Bars sit in the track when there is a label column, and in the row when there is not. */
	.bar {
		position: absolute;
		inset-block: 0;
		left: calc(var(--at) * 1%);
		width: calc(var(--dur) * 1% - 5px);
		display: flex;
		align-items: center;
		padding: 0 1rem;
		box-sizing: border-box;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 9%, transparent);
		font-size: 0.95rem;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
	}

	.row > .bar {
		left: calc(var(--label-w) + var(--at) * 1%);
	}

	.bar.plain {
		padding: 0;
	}

	.lane {
		font-size: 0.85rem;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.between {
		display: grid;
		grid-template-columns: minmax(0, 7rem) minmax(0, 1fr) minmax(0, 7rem);
		align-items: center;
		column-gap: 1.5rem;
	}

	.screen {
		height: 9rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 9%, transparent);
	}

	.questions {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.85rem;
		line-height: 1.3;
		color: var(--color-muted);
		text-align: center;
	}


	@media (max-width: 800px) {
		.frame {
			padding: 1.25rem 1rem;
		}

		.chart.labelled {
			--label-w: 4.75rem;
		}

		.chart.latency {
			--label-w: 7.75rem;
			--time-w: 3.25rem;
			--row-h: 2rem;
		}

		.bar {
			padding: 0 0.75rem;
			font-size: 0.9rem;
		}

		.between {
			grid-template-columns: minmax(0, 4.5rem) minmax(0, 1fr) minmax(0, 4.5rem);
			column-gap: 1rem;
		}

		.screen {
			height: 7.5rem;
		}
	}
</style>
