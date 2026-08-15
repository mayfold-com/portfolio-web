import { redirect } from '@sveltejs/kit';
import { getNote } from '$lib/data';

export function load({ params, url }: { params: { slug: string }; url: URL }) {
	const note = getNote(params.slug);
	if (!note) {
		redirect(302, '/notes');
	}
	const next = new URL(url);
	next.pathname = '/notes';
	next.searchParams.set('note', note.slug);
	redirect(301, `${next.pathname}${next.search}${next.hash}`);
}
