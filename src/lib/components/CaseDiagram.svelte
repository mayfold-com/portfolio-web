<script lang="ts">
	export type DiagramKind = 'mess' | 'reach' | 'sheet' | 'objects' | 'templates';

	let { kind }: { kind: DiagramKind } = $props();
</script>

{#if kind === 'mess'}
	<div
		class="diagram mess"
		role="img"
		aria-label="A packed top bar, a list with create sitting apart, and four different ways to open a record."
	>
		<div class="nav" aria-hidden="true">
			<span>Payments</span>
			<span>Accounts</span>
			<span>Reports</span>
			<span>Risk</span>
			<span>Settings</span>
			<span>Issuing</span>
			<span>Capital</span>
			<span>More</span>
		</div>
		<div class="split">
			<div class="win list">
				<span class="chrome"></span>
				<span class="label">List</span>
				<span class="ghost"></span>
				<span class="ghost"></span>
				<span class="ghost short"></span>
			</div>
			<div class="win create">
				<span class="chrome"></span>
				<span class="label">Create</span>
			</div>
		</div>
		<div class="opens">
			<div class="win side">
				<span class="chrome"></span>
				<span class="label">Side panel</span>
			</div>
			<div class="win modal">
				<span class="chrome"></span>
				<span class="label">Modal</span>
			</div>
			<div class="win page">
				<span class="chrome"></span>
				<span class="label">Full page</span>
			</div>
			<div class="win tab">
				<span class="chrome"></span>
				<span class="label">New tab</span>
			</div>
		</div>
	</div>
{:else if kind === 'reach'}
	<div
		class="diagram reach"
		role="img"
		aria-label="Each role reached more of the product: a flow, then the design system, then the Customer Area, then templates for every object."
	>
		<div class="row">
			<span class="role">Designer</span>
			<div class="bar" style:--w="22%">
				<span>One flow</span>
			</div>
		</div>
		<div class="row">
			<span class="role">Principal</span>
			<div class="bar" style:--w="46%">
				<span>Design system</span>
			</div>
		</div>
		<div class="row">
			<span class="role">Team lead</span>
			<div class="bar" style:--w="72%">
				<span>Customer Area</span>
			</div>
		</div>
		<div class="row">
			<span class="role">UX manager</span>
			<div class="bar" style:--w="100%">
				<span>Templates for every object</span>
			</div>
		</div>
	</div>
{:else if kind === 'sheet'}
	<div
		class="diagram sheet"
		role="img"
		aria-label="A sticker sheet of controls with no states, next to a button with default, hover, and disabled."
	>
		<div class="col">
			<span class="kicker">Sticker sheet</span>
			<div class="stickers">
				<span>Button</span>
				<span>Input</span>
				<span>Select</span>
				<span>Menu</span>
				<span>Tab</span>
				<span>Tag</span>
			</div>
		</div>
		<div class="col">
			<span class="kicker">With states</span>
			<div class="states">
				<div class="state">
					<span class="chip">Default</span>
					<span class="btn"></span>
				</div>
				<div class="state">
					<span class="chip">Hover</span>
					<span class="btn hover"></span>
				</div>
				<div class="state">
					<span class="chip">Disabled</span>
					<span class="btn off"></span>
				</div>
			</div>
		</div>
	</div>
{:else if kind === 'objects'}
	<div
		class="diagram objects"
		role="img"
		aria-label="Before, create sat away from its list. After, every object used list, create, then detail."
	>
		<div class="lane">
			<span class="kicker">Before</span>
			<div class="row-flow loose">
				<div class="step">
					<strong>List</strong>
					<span>Users</span>
				</div>
				<div class="gap" aria-hidden="true"></div>
				<div class="step stray">
					<strong>Create</strong>
					<span>In the menu</span>
				</div>
			</div>
		</div>
		<div class="lane">
			<span class="kicker">After</span>
			<div class="row-flow">
				<div class="step">
					<strong>List</strong>
					<span>Find it</span>
				</div>
				<span class="arrow" aria-hidden="true"></span>
				<div class="step">
					<strong>Create</strong>
					<span>Add it</span>
				</div>
				<span class="arrow" aria-hidden="true"></span>
				<div class="step">
					<strong>Detail</strong>
					<span>Open it</span>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div
		class="diagram templates"
		role="img"
		aria-label="Three teams built three different layouts for the same job. Project Boost used one list, create, and detail template."
	>
		<div class="teams">
			<div class="team">
				<span class="kicker">Payouts</span>
				<div class="mock table">
					<span></span><span></span><span></span>
					<span></span><span></span><span></span>
				</div>
			</div>
			<div class="team">
				<span class="kicker">Users</span>
				<div class="mock cards">
					<span></span><span></span>
				</div>
			</div>
			<div class="team">
				<span class="kicker">Accounts</span>
				<div class="mock form">
					<span class="wide"></span>
					<span></span>
					<span class="wide"></span>
				</div>
			</div>
		</div>
		<div class="boost">
			<span class="kicker">Project Boost</span>
			<div class="row-flow">
				<div class="step">
					<strong>List</strong>
				</div>
				<span class="arrow" aria-hidden="true"></span>
				<div class="step">
					<strong>Create</strong>
				</div>
				<span class="arrow" aria-hidden="true"></span>
				<div class="step">
					<strong>Detail</strong>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.diagram {
		box-sizing: border-box;
		width: 100%;
		color: var(--color-text);
		font: inherit;
	}

	.kicker {
		display: block;
		margin-bottom: 0.45rem;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		color: var(--color-muted);
	}

	.win {
		display: flex;
		flex-direction: column;
		border: 1px solid color-mix(in srgb, var(--color-text) 22%, transparent);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-text) 5%, var(--color-bg));
		overflow: hidden;
	}

	.chrome {
		display: block;
		height: 9px;
		background: color-mix(in srgb, var(--color-text) 10%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
	}

	.label {
		padding: 0.55rem 0.65rem 0.6rem;
		font-size: 0.78rem;
		line-height: 1.2;
		color: var(--color-muted);
	}

	.mess {
		display: grid;
		gap: 10px;
		padding: 2px;
	}

	.nav {
		display: flex;
		gap: 4px;
		padding: 6px;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 8px;
		overflow: hidden;
	}

	.nav span {
		flex: 0 0 auto;
		padding: 0.28rem 0.45rem;
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-text) 10%, transparent);
		font-size: 0.68rem;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.nav span:last-child {
		opacity: 0.55;
	}

	.split {
		display: grid;
		grid-template-columns: 1.4fr 0.7fr;
		gap: 12px;
		align-items: start;
	}

	.list {
		min-height: 5.2rem;
	}

	.ghost {
		display: block;
		height: 6px;
		margin: 0 0.65rem 6px;
		border-radius: 2px;
		background: color-mix(in srgb, var(--color-text) 12%, transparent);
	}

	.ghost.short {
		width: 42%;
	}

	.create {
		margin-top: 1.1rem;
		min-height: 2.6rem;
		transform: rotate(1.2deg);
		opacity: 0.78;
	}

	.opens {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr 1.1fr 0.7fr;
		gap: 8px;
		align-items: end;
	}

	.side {
		min-height: 3.4rem;
	}

	.modal {
		min-height: 2.5rem;
		transform: rotate(-0.8deg);
	}

	.page {
		min-height: 2.2rem;
	}

	.tab {
		min-height: 2rem;
		opacity: 0.7;
		transform: rotate(1.4deg);
	}

	.reach {
		display: grid;
		gap: 0.7rem;
		padding: 4px 2px 2px;
	}

	.row {
		display: grid;
		grid-template-columns: 6.4rem 1fr;
		gap: 0.75rem;
		align-items: center;
	}

	.role {
		font-size: 0.78rem;
		line-height: 1.25;
		color: var(--color-muted);
	}

	.bar {
		box-sizing: border-box;
		width: var(--w);
		min-height: 2rem;
		padding: 0.4rem 0.65rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 20%, transparent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-text) 8%, var(--color-bg));
	}

	.bar span {
		display: block;
		font-size: 0.78rem;
		line-height: 1.25;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sheet {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 1rem;
		padding: 2px;
	}

	.stickers {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}

	.stickers span {
		padding: 0.55rem 0.6rem;
		border: 1px dashed color-mix(in srgb, var(--color-text) 24%, transparent);
		border-radius: 6px;
		font-size: 0.78rem;
		color: var(--color-muted);
		text-align: center;
	}

	.states {
		display: grid;
		gap: 8px;
	}

	.state {
		display: grid;
		grid-template-columns: 4.4rem 1fr;
		gap: 0.55rem;
		align-items: center;
	}

	.chip {
		font-size: 0.72rem;
		color: var(--color-muted);
	}

	.btn {
		display: block;
		height: 1.55rem;
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-text) 22%, var(--color-bg));
	}

	.btn.hover {
		background: color-mix(in srgb, var(--color-text) 38%, var(--color-bg));
	}

	.btn.off {
		opacity: 0.35;
	}

	.objects,
	.templates {
		display: grid;
		gap: 1rem;
		padding: 2px;
	}

	.row-flow {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
	}

	.row-flow.loose {
		justify-content: space-between;
	}

	.step {
		flex: 1;
		display: grid;
		align-content: center;
		gap: 0.15rem;
		min-height: 3.6rem;
		padding: 0.7rem 0.7rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-text) 5%, var(--color-bg));
	}

	.step strong {
		font-size: 0.9rem;
		font-weight: var(--font-weight, 500);
		line-height: 1.2;
	}

	.step span {
		font-size: 0.75rem;
		line-height: 1.3;
		color: var(--color-muted);
	}

	.step.stray {
		flex: 0 0 38%;
		transform: translateY(8px) rotate(1.1deg);
		opacity: 0.78;
	}

	.gap {
		flex: 1;
		align-self: center;
		height: 1px;
		border-top: 1px dashed color-mix(in srgb, var(--color-text) 22%, transparent);
	}

	.arrow {
		flex: 0 0 16px;
		align-self: center;
		height: 1px;
		background: color-mix(in srgb, var(--color-text) 32%, transparent);
		position: relative;
	}

	.arrow::after {
		content: '';
		position: absolute;
		right: -1px;
		top: 50%;
		width: 6px;
		height: 6px;
		border-right: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
		transform: translateY(-50%) rotate(45deg);
	}

	.teams {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 8px;
	}

	.team,
	.boost {
		padding: 0.7rem 0.7rem 0.8rem;
		border: 1px solid color-mix(in srgb, var(--color-text) 16%, transparent);
		border-radius: 10px;
		background: color-mix(in srgb, var(--color-text) 4%, var(--color-bg));
	}

	.mock {
		display: grid;
		gap: 5px;
		min-height: 3.4rem;
	}

	.mock span {
		display: block;
		height: 7px;
		border-radius: 2px;
		background: color-mix(in srgb, var(--color-text) 14%, transparent);
	}

	.mock.table {
		grid-template-columns: 1.4fr 1fr 0.7fr;
	}

	.mock.cards {
		grid-template-columns: 1fr 1fr;
		min-height: 3.4rem;
	}

	.mock.cards span {
		height: 3.4rem;
		border-radius: 6px;
	}

	.mock.form .wide {
		width: 100%;
	}

	.mock.form span:nth-child(2) {
		width: 58%;
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.opens,
		.split,
		.sheet,
		.teams {
			grid-template-columns: 1fr 1fr;
		}

		.tab,
		.create {
			display: none;
		}

		.row-flow {
			flex-direction: column;
		}

		.step.stray {
			flex: 1;
			transform: none;
		}

		.arrow {
			flex: 0 0 12px;
			width: 1px;
			height: 12px;
			align-self: center;
		}

		.arrow::after {
			right: auto;
			left: 50%;
			top: auto;
			bottom: -1px;
			transform: translateX(-50%) rotate(135deg);
		}

		.gap {
			flex: 0 0 12px;
			width: 1px;
			height: 12px;
			border-top: 0;
			border-left: 1px dashed color-mix(in srgb, var(--color-text) 22%, transparent);
			align-self: center;
		}
	}
</style>
