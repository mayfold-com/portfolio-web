export type NoteInlinePart =
	| { type: 'text'; text: string }
	| { type: 'em'; text: string }
	| { type: 'ref'; id: string }
	| { type: 'link'; text: string; href: string };

const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\[\^(\d+)\]|\*([^*]+)\*/g;

export function parseNoteInline(input: string): NoteInlinePart[] {
	const parts: NoteInlinePart[] = [];
	let cursor = 0;

	for (const match of input.matchAll(TOKEN)) {
		const index = match.index ?? 0;
		if (index > cursor) {
			parts.push({ type: 'text', text: input.slice(cursor, index) });
		}

		if (match[1] && match[2]) {
			parts.push({ type: 'link', text: match[1], href: match[2] });
		} else if (match[3]) {
			parts.push({ type: 'ref', id: match[3] });
		} else if (match[4]) {
			parts.push({ type: 'em', text: match[4] });
		}

		cursor = index + match[0].length;
	}

	if (cursor < input.length) {
		parts.push({ type: 'text', text: input.slice(cursor) });
	}

	return parts;
}
