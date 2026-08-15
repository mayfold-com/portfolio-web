<script lang="ts">
	import type { CasePhoneScreen } from '$lib/data';

	let {
		screens,
		blockIndex,
		openKey,
		onOpen
	}: {
		screens: CasePhoneScreen[];
		blockIndex: number;
		openKey: string | null;
		onOpen: (event: MouseEvent, screen: CasePhoneScreen, index: number) => void;
	} = $props();

	const shown = $derived(screens.slice(0, 3));
	const label = $derived(
		shown
			.map((screen) => screen.caption)
			.filter(Boolean)
			.join(', ') || 'App screens'
	);
</script>

{#if shown.length}
	<figure class="stage count-{shown.length}" aria-label={label}>
		<div class="row">
			{#each shown as screen, i (`${blockIndex}-${i}`)}
				{@const key = `phones-${blockIndex}-${i}`}
				<div class="phone">
					<div class="bezel">
						<span class="island" aria-hidden="true"></span>
						<div class="screen">
							{#if screen.src}
								<button
									type="button"
									class="shot"
									class:is-figure-open={openKey === key}
									data-figure-key={key}
									aria-label={screen.caption
										? `Open screen: ${screen.caption}`
										: 'Open screen'}
									style:background={screen.background}
									onclick={(event) => onOpen(event, screen, i)}
								>
									<img src={screen.src} alt="" decoding="async" draggable="false" />
								</button>
							{:else}
								<div class="shot" style:background={screen.background}></div>
							{/if}
						</div>
						<span class="home" aria-hidden="true"></span>
					</div>
					{#if screen.caption}
						<p class="caption">{screen.caption}</p>
					{/if}
				</div>
			{/each}
		</div>
	</figure>
{/if}

<style>
	.stage {
		width: 100%;
		max-width: var(--span-4);
		margin: 0;
		padding: 2.75rem 1.25rem 1.6rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
		box-sizing: border-box;
	}

	.row {
		--phone-w: min(14.75rem, 70%);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		gap: 1.15rem;
		width: 100%;
	}

	.count-2 .row {
		--phone-w: min(12.35rem, calc((100% - 1.15rem) / 2));
	}

	.count-3 .row {
		--phone-w: min(10.15rem, calc((100% - 1.7rem) / 3));
		gap: 0.85rem;
	}

	.phone {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 0 1 auto;
		min-width: 0;
	}

	.bezel {
		position: relative;
		width: var(--phone-w);
		aspect-ratio: 9 / 19.5;
		padding: 0.52rem 0.4rem 0.58rem;
		border-radius: 1.85rem;
		background: color-mix(in srgb, var(--color-text) 90%, var(--color-bg));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-bg) 14%, transparent);
		box-sizing: border-box;
	}

	.island {
		position: absolute;
		top: 0.78rem;
		left: 50%;
		z-index: 2;
		width: 28%;
		height: 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-text) 90%, var(--color-bg));
		transform: translateX(-50%);
	}

	.screen {
		height: 100%;
		border-radius: 1.38rem;
		overflow: hidden;
		background: #111;
	}

	.shot {
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		border-radius: inherit;
		background: #111;
		cursor: default;
	}

	button.shot {
		cursor: zoom-in;
	}

	.shot img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
	}

	.shot.is-figure-open,
	.shot.is-figure-open img {
		opacity: 0;
	}

	.home {
		position: absolute;
		bottom: 0.42rem;
		left: 50%;
		z-index: 2;
		width: 26%;
		height: 0.22rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.28);
		transform: translateX(-50%);
		pointer-events: none;
	}

	.caption {
		margin: 0.7rem 0 0;
		max-width: var(--phone-w);
		font-size: 0.8rem;
		line-height: 1.4;
		text-align: center;
		color: var(--color-body);
	}

	@media (max-width: 800px) {
		.stage {
			padding: 2rem 0.7rem 1.25rem;
		}

		.row {
			gap: 0.7rem;
		}

		.count-1 .row {
			--phone-w: min(13.5rem, 62%);
		}

		.count-2 .row {
			--phone-w: min(10.6rem, calc((100% - 0.7rem) / 2));
		}

		.count-3 .row {
			--phone-w: min(8.15rem, calc((100% - 1.4rem) / 3));
		}
	}
</style>
