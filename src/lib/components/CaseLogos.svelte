<script lang="ts">
	import { fly } from 'svelte/transition';

	type Logo = { src: string; alt: string };

	const SLOT_COUNT = 4;
	const SWAP_MS = 2200;

	let { items }: { items: Logo[] } = $props();

	let slots = $state<Logo[]>(items.slice(0, SLOT_COUNT));

	$effect(() => {
		const pool = items;
		if (pool.length <= SLOT_COUNT) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let nextSlot = 0;
		const id = setInterval(() => {
			const used = new Set(slots.map((slot) => slot.src));
			const rest = pool.filter((item) => !used.has(item.src));
			if (!rest.length) return;
			const incoming = rest[Math.floor(Math.random() * rest.length)];
			slots[nextSlot % SLOT_COUNT] = incoming;
			nextSlot += 1;
		}, SWAP_MS);

		return () => clearInterval(id);
	});
</script>

<figure class="logo-card" aria-label="Adyen customers">
	<ul>
		{#each slots as logo, i (i)}
			<li>
				{#key logo.src}
					<span
						class="mark"
						in:fly={{ y: 10, duration: 420 }}
						out:fly={{ y: -10, duration: 320 }}
					>
						<img src={logo.src} alt={logo.alt} />
					</span>
				{/key}
			</li>
		{/each}
	</ul>
</figure>

<style>
	.logo-card {
		width: 100%;
		margin: 0;
		padding: 1.25rem 1.5rem 1.4rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
		box-sizing: border-box;
	}

	ul {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		position: relative;
		height: 4.6rem;
		overflow: hidden;
	}

	.mark {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	img {
		display: block;
		height: 3.35rem;
		width: auto;
		max-width: 90%;
		object-fit: contain;
		filter: brightness(0) invert(1);
		opacity: 0.62;
	}

	@media (prefers-reduced-motion: reduce) {
		.mark {
			transition: none;
		}
	}
</style>
