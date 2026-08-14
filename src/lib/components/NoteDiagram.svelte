<script lang="ts">
	export type NoteDiagramKind =
		| 'collision'
		| 'wait'
		| 'match'
		| 'argue'
		| 'gaps'
		| 'survive'
		| 'timelines'
		| 'questions'
		| 'versions'
		| 'states'
		| 'stages'
		| 'matrix'
		| 'loop'
		| 'credit'
		| 'pull';

	let { kind }: { kind: NoteDiagramKind } = $props();
</script>

{#if kind === 'collision'}
	<div
		class="diagram collision"
		role="img"
		aria-label="Three agents changing one product. One updates the model, one still uses the old model, and one redesigns a page that was just removed."
	>
		<div class="agents">
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Agent 1</span>
				<strong>Changes the model</strong>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Agent 2</span>
				<strong>Assumes the old model</strong>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Agent 3</span>
				<strong>Redesigns a removed page</strong>
			</div>
		</div>
		<div class="join" aria-hidden="true"></div>
		<div class="pill">One product</div>
	</div>
{:else if kind === 'wait'}
	<div
		class="diagram wait"
		role="img"
		aria-label="A fast loop keeps one problem in view. A slow wait leaves a gap that another task fills."
	>
		<div class="lane">
			<span class="kicker">Fast response</span>
			<div class="flow">
				<span class="step">Try</span>
				<span class="arrow" aria-hidden="true"></span>
				<span class="step">See</span>
				<span class="arrow" aria-hidden="true"></span>
				<span class="step">Correct</span>
			</div>
			<p>The problem stays in my head.</p>
		</div>
		<div class="lane">
			<span class="kicker">Slow response</span>
			<div class="flow">
				<span class="step muted">Waiting</span>
				<span class="void" aria-hidden="true"></span>
				<span class="step stray">Another task</span>
			</div>
			<p>The empty space fills itself.</p>
		</div>
	</div>
{:else if kind === 'match'}
	<div
		class="diagram match"
		role="img"
		aria-label="A fast model for work in the loop. A slower model for work that can stand on its own. Keep one active branch."
	>
		<div class="pair">
			<div class="lane">
				<span class="kicker">In the loop</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Fast model</strong>
					<span class="detail">Explore, copy, a small fix</span>
				</div>
			</div>
			<div class="lane">
				<span class="kicker">On its own</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Slower model</strong>
					<span class="detail">Review, plan, investigation</span>
				</div>
			</div>
		</div>
		<div class="branch">
			<span class="kicker">One active branch</span>
			<div class="rule" aria-hidden="true"></div>
		</div>
	</div>
{:else if kind === 'argue'}
	<div
		class="diagram argue"
		role="img"
		aria-label="A tidy static screen next to a rough working flow that talks back with a failed payment."
	>
		<div class="pair">
			<div class="lane">
				<span class="kicker">Static screen</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Looks finished</strong>
					<span class="ghost"></span>
					<span class="ghost"></span>
					<span class="ghost short"></span>
				</div>
			</div>
			<div class="lane">
				<span class="kicker">Working version</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Argues back</strong>
					<span class="step compact">Continue</span>
					<span class="step stray compact">Paid, then the API failed</span>
				</div>
			</div>
		</div>
	</div>
{:else if kind === 'gaps'}
	<div
		class="diagram gaps"
		role="img"
		aria-label="Three screens with the real product sitting in the gaps: loading, going back, empty states, and failure."
	>
		<div class="journey">
			<div class="win screen">
				<span class="chrome"></span>
				<strong>Start</strong>
			</div>
			<div class="gap">
				<span>Load?</span>
				<span>Back?</span>
			</div>
			<div class="win screen">
				<span class="chrome"></span>
				<strong>Choose</strong>
			</div>
			<div class="gap">
				<span>Empty?</span>
				<span>Fail?</span>
			</div>
			<div class="win screen">
				<span class="chrome"></span>
				<strong>Pay</strong>
			</div>
		</div>
		<p>The product appears between the screens.</p>
	</div>
{:else if kind === 'survive'}
	<div
		class="diagram survive"
		role="img"
		aria-label="Build, use, fix, and remove come first. Design is what happens to the version that survived."
	>
		<div class="flow wrap">
			<span class="step muted">Build</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step muted">Use</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step muted">Fix</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step muted">Remove</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step">Design</span>
		</div>
		<p>Polish the version that survived contact.</p>
	</div>
{:else if kind === 'timelines'}
	<div
		class="diagram timelines"
		role="img"
		aria-label="The team lives through months of gradual change. A merchant meets all of it in one login."
	>
		<div class="lane">
			<span class="kicker">The team</span>
			<div class="track">
				<span class="tick">Week</span>
				<span class="tick">Week</span>
				<span class="tick">Week</span>
				<span class="tick">Week</span>
				<span class="tick">Ship</span>
			</div>
			<p>Months of context.</p>
		</div>
		<div class="lane">
			<span class="kicker">The merchant</span>
			<div class="track">
				<span class="void long" aria-hidden="true"></span>
				<span class="step">One login</span>
			</div>
			<p>Tuesday, with yesterday’s map.</p>
		</div>
	</div>
{:else if kind === 'questions'}
	<div
		class="diagram questions"
		role="img"
		aria-label="Support questions stacking up around the product changes that moved familiar work."
	>
		<div class="cluster">
			<span class="ask">Where did this go?</span>
			<span class="ask">Where did this go?</span>
			<span class="ask">Where did this go?</span>
		</div>
		<div class="track">
			<span class="tick">Nav moved</span>
			<span class="tick">Pages rebuilt</span>
			<span class="tick">Actions moved</span>
		</div>
		<p>One question is noise. A pattern is the budget running out.</p>
	</div>
{:else if kind === 'versions'}
	<div
		class="diagram versions"
		role="img"
		aria-label="Three versions of one workflow: the familiar one, an intermediate that keeps the old route, and the final one."
	>
		<div class="trio">
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Familiar</span>
				<strong>The old route</strong>
				<span class="ghost"></span>
				<span class="ghost short"></span>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Intermediate</span>
				<strong>Both still visible</strong>
				<span class="ghost"></span>
				<span class="ghost short"></span>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Final</span>
				<strong>The new default</strong>
				<span class="ghost"></span>
				<span class="ghost short"></span>
			</div>
		</div>
	</div>
{:else if kind === 'states'}
	<div
		class="diagram states"
		role="img"
		aria-label="An early style guide with one state beside a later component that covers the states teams actually need."
	>
		<div class="pair">
			<div class="lane">
				<span class="kicker">Style guide</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Default</strong>
					<span class="detail">Hover, error, empty: missing</span>
				</div>
			</div>
			<div class="lane">
				<span class="kicker">In the product</span>
				<div class="chip-row">
					<span class="step compact">Default</span>
					<span class="step compact">Hover</span>
					<span class="step compact">Error</span>
					<span class="step compact">Empty</span>
					<span class="step compact">Disabled</span>
				</div>
			</div>
		</div>
	</div>
{:else if kind === 'stages'}
	<div
		class="diagram stages"
		role="img"
		aria-label="Three stages of the system: an early style guide, volunteer time after product work, and a dedicated team."
	>
		<div class="trio">
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Early</span>
				<strong>Style guide</strong>
				<span class="detail">A file, many gaps</span>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Volunteer</span>
				<strong>After product work</strong>
				<span class="detail">Stops when the deadline moves</span>
			</div>
			<div class="win">
				<span class="chrome"></span>
				<span class="kicker">Dedicated</span>
				<strong>Protected time</strong>
				<span class="detail">Contributions have somewhere to go</span>
			</div>
		</div>
	</div>
{:else if kind === 'matrix'}
	<div
		class="diagram matrix"
		role="img"
		aria-label="Four outcomes of a shared system: ignored, worked around, debated, or shared, depending on ease of use and influence."
	>
		<div class="grid">
			<span class="axis"></span>
			<span class="axis">Closed</span>
			<span class="axis">Open</span>
			<span class="axis">Hard to use</span>
			<span class="cell">Ignored</span>
			<span class="cell">Debated</span>
			<span class="axis">Easy to use</span>
			<span class="cell">Worked around</span>
			<span class="cell hot">Shared</span>
		</div>
	</div>
{:else if kind === 'loop'}
	<div
		class="diagram loop"
		role="img"
		aria-label="A contribution starts as a product problem, is tested locally, reviewed, then shared back into new product work."
	>
		<div class="flow wrap">
			<span class="step">Problem</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step">Local test</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step">Review</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step">Shared</span>
			<span class="arrow" aria-hidden="true"></span>
			<span class="step">Product work</span>
		</div>
		<p>Context from the product. Quality from the system team.</p>
	</div>
{:else if kind === 'credit'}
	<div
		class="diagram credit"
		role="img"
		aria-label="A release note that names the people, the problem they solved, and where the pattern can be reused."
	>
		<div class="win note">
			<span class="chrome"></span>
			<span class="kicker">Changelog</span>
			<strong>Account switcher states</strong>
			<div class="meta">
				<span>By the designer and engineer who hit the gap</span>
				<span>Now reusable in Payments and Reports</span>
			</div>
		</div>
	</div>
{:else}
	<div
		class="diagram pull"
		role="img"
		aria-label="Required usage produces compliance. Pull is when teams choose the system when nobody is checking."
	>
		<div class="pair">
			<div class="lane">
				<span class="kicker">Required</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Usage</strong>
					<span class="detail">Someone is checking</span>
				</div>
			</div>
			<div class="lane">
				<span class="kicker">Chosen</span>
				<div class="win">
					<span class="chrome"></span>
					<strong>Pull</strong>
					<span class="detail">Nobody is checking</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.diagram {
		box-sizing: border-box;
		width: 100%;
		padding: 1.15rem 1.1rem 1.2rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-text) 6%, var(--color-bg));
		color: var(--color-text);
		font: inherit;
	}

	.kicker {
		display: block;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.win {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-text) 4%, var(--color-bg));
		overflow: hidden;
	}

	.chrome {
		display: block;
		height: 9px;
		background: color-mix(in srgb, var(--color-text) 10%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
	}

	.win .kicker,
	.win strong,
	.win .detail,
	.win .step,
	.win .meta {
		padding-left: 0.7rem;
		padding-right: 0.7rem;
	}

	.win .kicker {
		padding-top: 0.55rem;
	}

	.win strong {
		padding-top: 0.2rem;
		padding-bottom: 0.7rem;
		font-size: 0.88rem;
		font-weight: var(--font-weight);
		line-height: 1.3;
	}

	.win .detail {
		padding-bottom: 0.75rem;
		font-size: 0.78rem;
		line-height: 1.35;
		color: var(--color-muted);
	}

	.win .step {
		margin: 0 0.7rem 0.45rem;
		padding-left: 0.55rem;
		padding-right: 0.55rem;
		width: fit-content;
	}

	.win .step:last-child {
		margin-bottom: 0.75rem;
	}

	.ghost {
		display: block;
		height: 7px;
		margin: 0 0.7rem 0.4rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-text) 12%, transparent);
	}

	.ghost.short {
		width: 42%;
	}

	.ghost:last-child {
		margin-bottom: 0.8rem;
	}

	.pill {
		padding: 0.4rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 999px;
		font-size: 0.78rem;
		color: var(--color-muted);
	}

	p {
		margin: 0.55rem 0 0;
		font-size: 0.78rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	.lane .kicker,
	.branch .kicker {
		margin-bottom: 0.45rem;
	}

	.flow,
	.track,
	.chip-row,
	.journey {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
	}

	.flow.wrap,
	.chip-row,
	.track {
		flex-wrap: wrap;
	}

	.step {
		flex: 0 0 auto;
		padding: 0.4rem 0.65rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 8px;
		font-size: 0.82rem;
		line-height: 1.2;
	}

	.step.compact {
		padding: 0.32rem 0.55rem;
		font-size: 0.78rem;
	}

	.step.muted,
	.tick {
		color: var(--color-muted);
	}

	.step.stray {
		border-style: dashed;
	}

	.arrow {
		flex: 0 0 1.1rem;
		height: 1px;
		background: color-mix(in srgb, var(--color-text) 28%, transparent);
	}

	.void {
		flex: 1 1 2.5rem;
		height: 1px;
		background-image: linear-gradient(
			to right,
			color-mix(in srgb, var(--color-text) 28%, transparent) 40%,
			transparent 0
		);
		background-size: 7px 1px;
		background-repeat: repeat-x;
	}

	.void.long {
		flex-basis: 4.5rem;
	}

	.pair,
	.trio,
	.agents {
		display: grid;
		gap: 0.75rem;
		width: 100%;
	}

	.pair {
		grid-template-columns: 1fr 1fr;
	}

	.trio,
	.agents {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.collision {
		display: grid;
		justify-items: center;
		gap: 0;
	}

	.collision .agents {
		gap: 0.65rem;
	}

	.join {
		width: 1px;
		height: 1.1rem;
		background: color-mix(in srgb, var(--color-text) 22%, transparent);
	}

	.wait,
	.match,
	.argue,
	.gaps,
	.survive,
	.timelines,
	.questions,
	.versions,
	.states,
	.stages,
	.matrix,
	.loop,
	.credit,
	.pull {
		display: grid;
		gap: 1.1rem;
	}

	.gaps,
	.survive,
	.questions,
	.loop,
	.credit {
		gap: 0.7rem;
	}

	.match .win strong,
	.argue .win strong,
	.versions .win strong,
	.states .win strong,
	.stages .win strong,
	.credit .win strong,
	.pull .win strong {
		padding-bottom: 0.25rem;
	}

	.branch .rule {
		height: 2px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-text) 22%, transparent);
	}

	.screen strong {
		padding-bottom: 0.75rem;
	}

	.gap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-width: 2.6rem;
		font-size: 0.7rem;
		line-height: 1.25;
		color: var(--color-muted);
	}

	.tick {
		flex: 1 1 auto;
		padding: 0.4rem 0.55rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent);
		border-radius: 8px;
		font-size: 0.78rem;
		line-height: 1.2;
		text-align: center;
	}

	.cluster {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.ask {
		padding: 0.32rem 0.6rem;
		border: 1px dashed color-mix(in srgb, var(--color-text) 22%, transparent);
		border-radius: 999px;
		font-size: 0.75rem;
		color: var(--color-muted);
	}

	.grid {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		gap: 0.45rem;
		align-items: stretch;
	}

	.axis {
		display: flex;
		align-items: center;
		padding: 0.15rem 0.2rem;
		font-size: 0.72rem;
		color: var(--color-muted);
	}

	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 3.1rem;
		padding: 0.55rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 16%, transparent);
		border-radius: 8px;
		font-size: 0.82rem;
		text-align: center;
	}

	.cell.hot {
		border-color: color-mix(in srgb, var(--color-text) 32%, transparent);
		background: color-mix(in srgb, var(--color-text) 6%, transparent);
	}

	.meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-bottom: 0.8rem;
		font-size: 0.78rem;
		line-height: 1.4;
		color: var(--color-muted);
	}

	@media (max-width: 800px) {
		.agents,
		.pair,
		.trio {
			grid-template-columns: 1fr;
		}

		.journey {
			flex-wrap: wrap;
		}

		.grid {
			grid-template-columns: 1fr;
		}

		.axis:empty {
			display: none;
		}
	}
</style>
