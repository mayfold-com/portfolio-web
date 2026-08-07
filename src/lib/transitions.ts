import { onNavigate } from '$app/navigation';

/** Enables the View Transitions API for client-side navigations. */
export function preparePageTransition() {
	onNavigate((navigation) => {
		if (typeof document === 'undefined' || !document.startViewTransition) return;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
}
