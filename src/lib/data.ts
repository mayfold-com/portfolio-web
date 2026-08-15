export const profile = {
	name: 'Naim Chayata',
	location: 'Utrecht, The Netherlands',
	/** Two-line hero. Soft break is intentional. */
	title: 'A design leader who never stopped making things.',
	subline:
		'I spent seven years at Adyen, moving from hands-on product design to leading designers, writers and researchers across its merchant, developer and checkout experiences. These days, I build products of my own.',
	email: null as string | null,
	linkedin: 'https://www.linkedin.com/in/naimchayata/'
};

export const navItems = [
	{ href: '/', label: 'Naim Chayata' },
	{ href: '/work', label: 'Work' },
	{ href: '/notes', label: 'Notes' },
	{ href: '/resume', label: 'Resume' }
] as const;

export type CardSize = 'tall' | 'mid' | 'short';

/** Placeholder media ratio for mock case-study figures. */
export type CaseFigureRatio = 'wide' | 'square' | 'tall' | 'ultrawide' | 'strip';

export type CaseStudyEmbed = 'menu' | 'mess' | 'objects' | 'templates';

/** One bar in the role timeline. Dates are 'YYYY-MM'. */
export type CaseTimelineRole = {
	role: string;
	note?: string;
	start: string;
	end: string;
	/** Held alongside another title instead of after it. */
	concurrent?: boolean;
};

export type CasePhoneScreen = {
	src?: string;
	caption?: string;
	background?: string;
};

export type CaseStudyBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	| {
			type: 'figure';
			ratio?: CaseFigureRatio;
			caption?: string;
			src?: string;
			/** Backdrop behind the image (thumb + figure viewer). */
			background?: string;
			/** Pad the image on the thumbnail backdrop with an 8px radius. */
			framed?: boolean;
			/** Full-res peek: pad top/left, clip bottom/right. */
			peek?: boolean;
			/** Start cropped at the bottom, then expand when scrolled into view. */
			expand?: boolean;
			/** Show the image centered at this fraction of the frame (e.g. 0.5). */
			scale?: number;
			/** Tight framed inset; image spans the padded width, full photo visible. */
			fill?: boolean;
	  }
	| {
			type: 'figures';
			ratio?: CaseFigureRatio;
			count: 2 | 3;
			captions?: string[];
			srcs?: string[];
			backgrounds?: string[];
			framed?: boolean | boolean[];
			/** Full-res peek per figure: pad top/left, clip bottom/right. */
			peek?: boolean | boolean[];
	  }
	| {
			type: 'embed';
			embed: CaseStudyEmbed;
			caption?: string;
	  }
	| { type: 'list'; title: string; items: string[] }
	| { type: 'qa'; q: string; a: string | string[] }
	| { type: 'timeline'; roles: CaseTimelineRole[] }
	| { type: 'logos'; items: { src: string; alt: string }[] }
	| {
			type: 'phones';
			/** One to three screens, centered in a single stage. */
			screens: CasePhoneScreen[];
	  };

export type CaseFigure = Extract<CaseStudyBlock, { type: 'figure' }>;
export type CaseFigures = Extract<CaseStudyBlock, { type: 'figures' }>;
export type CasePhones = Extract<CaseStudyBlock, { type: 'phones' }>;

/** One chapter in a personal-product case. Add `media` when the visuals are ready. */
export type ProductStoryBeat = {
	heading: string;
	text: string | string[];
	media?: Array<CaseFigure | CaseFigures | CasePhones>;
};

function storyParagraphs(text: string | string[]): CaseStudyBlock[] {
	return (Array.isArray(text) ? text : [text]).map((paragraph) => ({
		type: 'paragraph' as const,
		text: paragraph
	}));
}

/**
 * Shared shape for Plekka, Rolls, Mayfold and the next ones:
 * idea → optional overview figure → beats (heading, copy, images) → optional status.
 */
export function productStory(story: {
	idea: string | string[];
	overview?: CaseFigure | CaseFigures;
	beats: ProductStoryBeat[];
	status?: string | string[];
}): CaseStudyBlock[] {
	const blocks: CaseStudyBlock[] = [...storyParagraphs(story.idea)];
	if (story.overview) blocks.push(story.overview);
	for (const beat of story.beats) {
		blocks.push({ type: 'heading', text: beat.heading });
		blocks.push(...storyParagraphs(beat.text));
		if (beat.media) blocks.push(...beat.media);
	}
	if (story.status) blocks.push(...storyParagraphs(story.status));
	return blocks;
}

export type WorkProject = {
	id: string;
	title: string;
	meta: string;
	description: string;
	/** Longer copy shown in the project sheet */
	body: string[];
	/** Optional long-form case study blocks (headings, copy, grey figures). */
	caseStudy?: CaseStudyBlock[];
	/** Sheet shows a short “coming soon” state instead of a full case study. */
	comingSoon?: boolean;
	services?: string;
	year: string;
	role?: string;
	stage?: string;
	/** Overrides for the sheet meta labels (e.g. “Last role” instead of “Role”). */
	metaLabels?: { role?: string; services?: string; year?: string };
	/** Short mock highlights for the project overlay */
	highlights?: string[];
	link?: { label: string; href: string };
	/** Looping muted video used as card / thumb media (mp4) */
	video?: string;
	/** Optional WebM sibling for cheaper decode where supported */
	videoWebm?: string;
	/** Still shown before the video is near the viewport */
	poster?: string;
	/** Homepage / work card height variant */
	cardSize?: CardSize;
};

export const workProjects: WorkProject[] = [
	{
		id: 'adyen',
		title: 'Adyen',
		meta: 'UX leadership — 2018–2025',
		description:
			'Over seven years, I went from designing the foundations of Adyen’s merchant platform to leading teams across its merchant, developer and checkout experiences.',
		body: [
			'Almost seven years at Adyen. I left as UX Manager, leading teams across the merchant, developer and checkout experiences.',
			'I joined as a designer improving one part of the product. I left responsible for the people shaping several parts of it.'
		],
		caseStudy: [
			{
				type: 'timeline',
				roles: [
					{
						role: 'Product Designer',
						start: '2018-06',
						end: '2019-07'
					},
					{
						role: 'Principal Product Designer',
						start: '2019-07',
						end: '2021-06'
					},
					{
						role: 'Design System Lead',
						start: '2018-06',
						end: '2021-06',
						concurrent: true
					},
					{
						role: 'Engineering Team Lead',
						start: '2021-06',
						end: '2022-09'
					},
					{
						role: 'Product Design Manager',
						start: '2022-09',
						end: '2024-01'
					},
					{
						role: 'UX Manager',
						start: '2024-01',
						end: '2025-05'
					}
				]
			},
			{
				type: 'paragraph',
				text: 'I joined Adyen in 2018, when fewer than ten designers worked alongside roughly 300 engineers. Its merchant platform was already used by many of the world’s largest companies, but much of it had been built before designers joined the company. There was powerful technology underneath it, but the experience did not always make that power easy to understand or use.'
			},
			{
				type: 'heading',
				text: 'Building shared foundations'
			},
			{
				type: 'paragraph',
				text: 'One of the first problems I took on was the design system. An early style guide had brought some consistency to basic components, but it had no clear ownership or plan for how it should grow. Many states, behaviours and larger patterns were still missing.'
			},
			{
				type: 'paragraph',
				text: 'Working with designers and frontend engineers, I helped turn it into a documented system that teams could use in production. The work went beyond buttons and form fields. It included navigation, account structures and the recurring patterns behind list, detail and configuration pages.'
			},
			{
				type: 'paragraph',
				text: 'A design system only works when it makes shipping easier. We spent less time persuading teams to adopt it and more time making it useful enough that they wanted to.'
			},
			{
				type: 'heading',
				text: 'Designing for enterprise scale'
			},
			{
				type: 'paragraph',
				text: 'Adyen’s largest customers brought a different kind of complexity. A small business might operate through one account. A global company could manage hundreds of accounts, thousands of stores and many layers of access.'
			},
			{
				type: 'paragraph',
				text: 'I worked on navigation, account switching, bulk operations and user management. Some of these flows had to support actions across more than a hundred accounts or permissions spanning over 10,000 stores.'
			},
			{
				type: 'paragraph',
				text: 'We could not remove the underlying complexity, but we could stop exposing all of it at once. The work was about giving people a clear sense of where they were, what they could change and what the consequences would be.'
			},
			{
				type: 'logos',
				items: [
					{ src: '/media/customers/microsoft.svg', alt: 'Microsoft' },
					{ src: '/media/customers/mcdonalds.svg', alt: 'McDonald’s' },
					{ src: '/media/customers/uber.svg', alt: 'Uber' },
					{ src: '/media/customers/ebay.svg', alt: 'eBay' },
					{ src: '/media/customers/spotify.svg', alt: 'Spotify' },
					{ src: '/media/customers/booking.svg', alt: 'Booking.com' },
					{ src: '/media/customers/linkedin.svg', alt: 'LinkedIn' },
					{ src: '/media/customers/klm.svg', alt: 'KLM' },
					{ src: '/media/customers/etsy.svg', alt: 'Etsy' },
					{ src: '/media/customers/wise.svg', alt: 'Wise' },
					{ src: '/media/customers/gap.svg', alt: 'Gap' },
					{ src: '/media/customers/loreal.svg', alt: 'L’Oréal' },
					{ src: '/media/customers/farfetch.svg', alt: 'Farfetch' },
					{ src: '/media/customers/easyjet.svg', alt: 'easyJet' },
					{ src: '/media/customers/levis.svg', alt: 'Levi’s' },
					{ src: '/media/customers/wix.svg', alt: 'Wix' },
					{ src: '/media/customers/mango.svg', alt: 'Mango' },
					{ src: '/media/customers/swarovski.svg', alt: 'Swarovski' }
				]
			},
			{
				type: 'heading',
				text: 'Leading beyond design'
			},
			{
				type: 'paragraph',
				text: 'As Engineering Team Lead, I became responsible for a multidisciplinary Customer Area team spanning design, frontend and backend engineering.'
			},
			{
				type: 'paragraph',
				text: 'When the existing search experience could no longer keep up with Adyen’s largest merchants, the team replaced it with a faster and more reliable system built on Elasticsearch. The work involved more than redesigning the interface. We had to understand technical dependencies, plan the migration and roll it out without disrupting the platform around it.'
			},
			{
				type: 'paragraph',
				text: 'The team itself also needed attention. Two product managers depended on many of the same engineers, making priorities and ownership difficult to follow. I split the group around clearer areas of responsibility and introduced a lightweight delivery rhythm that gave us more oversight without adding unnecessary process.'
			},
			{
				type: 'paragraph',
				text: 'This changed how I thought about product leadership. The quality of the interface depended on decisions made across the whole system, so design could not operate as a separate step at the end.'
			},
			{
				type: 'heading',
				text: 'From one product to a portfolio'
			},
			{
				type: 'paragraph',
				text: 'When I moved into design management, my responsibility became much broader than the Customer Area.'
			},
			{
				type: 'paragraph',
				text: 'At different points, my remit included the merchant platform, localization, the franchisee platform, developer documentation and shopper-facing checkout components. These products served different audiences, from merchants operating complex global businesses to developers integrating Adyen and shoppers completing a payment.'
			},
			{
				type: 'paragraph',
				text: 'I did not need to be the designer closest to every detail. My job was to make ownership clear, put the right people on the right problems and help teams make sound decisions. I reviewed key work, challenged scopes, connected teams working on related problems and represented UX in wider product and leadership discussions.'
			},
			{
				type: 'paragraph',
				text: 'The breadth was useful. Decisions made in documentation affected integration. Checkout components had to work across markets. Shared platform patterns could reduce repeated work elsewhere. Treating each area as an isolated product would have made all of them weaker.'
			},
			{
				type: 'heading',
				text: 'Building the team'
			},
			{
				type: 'paragraph',
				text: 'I grew the design team from six to thirteen people. I hired designers, coached them through difficult projects and handled performance, development and career conversations.'
			},
			{
				type: 'paragraph',
				text: 'As the group grew, my role became less about supplying answers and more about giving people the context and trust to make their own calls. Three people I managed went on to become team leads. Others grew into senior and staff-level roles.'
			},
			{
				type: 'paragraph',
				text: 'I joined Adyen as a designer focused on improving one part of the product. I left responsible for the people shaping several parts of its experience. Some of the foundations I worked on are still visible in the platform, but the part I value most is that the teams and people continued to grow without needing me in the room.'
			},
			{
				type: 'figure',
				ratio: 'wide',
				src: '/media/adyen-community.jpg',
				framed: true,
				fill: true
			}
		],
		services: 'Product design, multidisciplinary leadership, team development',
		year: '2018–2025',
		role: 'UX Manager',
		metaLabels: { role: 'Last role', services: 'Scope', year: 'Years' },
		highlights: [
			'Multidisciplinary UX team',
			'Product narrative and focus',
			'Coherence across languages and markets'
		],
		link: { label: 'adyen.com', href: 'https://www.adyen.com' },
		video: '/media/adyen.mp4?v=1080',
		poster: '/media/adyen-poster.jpg?v=1080',
		cardSize: 'mid'
	},
	{
		id: 'mayfold',
		title: 'Mayfold',
		meta: 'Founder — 2025–Present',
		description:
			'AI photography with the control of an art-directed shoot. Same product, same person, different outfits — convincing down to fabric and light.',
		body: [
			'Mayfold is my personal product lab for AI-enabled products. The main thread is fashion photography that holds up next to real shoots — consistency, fabric, light — not one-off demos.',
			'I use it to stay hands-on across product, design, and implementation, and to test ideas without waiting on a brief.'
		],
		caseStudy: productStory({
			idea: [
				'Mayfold is my personal product lab for AI-enabled products. The main thread is fashion photography that holds up next to real shoots — consistency, fabric, light — not one-off demos.',
				'I use it to stay hands-on across product, design, and implementation, and to test ideas without waiting on a brief.'
			],
			overview: {
				type: 'figure',
				ratio: 'wide',
				src: '/media/mayfold-models.jpg',
				caption: 'Browsing models in Mayfold',
				framed: true
			},
			beats: []
		}),
		services: 'Product, Design, Engineering',
		year: '2025 – Present',
		role: 'Founder',
		highlights: [
			'AI fashion photography pipelines',
			'End-to-end product experiments',
			'Design + engineering in one loop'
		],
		link: { label: 'mayfold.com', href: 'https://mayfold.com' },
		video: '/media/mayfold.mp4',
		poster: '/media/mayfold.jpg',
		cardSize: 'tall'
	},
	{
		id: 'plekka',
		title: 'Plekka',
		meta: 'Hotel booking — closed beta',
		description:
			'The trip starts when you book it. Plekka compares live hotel rates and says when another offer is better.',
		body: [
			'The trip starts when you book it.',
			'Most hotel sites stop being useful as soon as you pay. That feels backwards. Booking is when a trip becomes real.'
		],
		caseStudy: productStory({
			idea: [
				'The trip starts when you book it.',
				'Most hotel sites stop being useful as soon as you pay. That feels backwards. Booking is when a trip becomes real. You know where you are going, when you will be there and where you will wake up.',
				'Plekka starts with a practical job: help people book a hotel without wondering whether the same room is cheaper elsewhere. It compares its live rates with other booking sites and says when another offer is better.',
				'I am building Plekka around a simple idea: earn trust on the price, then use that trust to make the trip better.'
			],
			beats: [
				{
					heading: 'Trust has to come first',
					text: [
						'A new travel brand cannot begin with loyalty. It first has to prove that the room, price and conditions are right.',
						'This is harder than placing several prices in a table. Hotel suppliers use different room names and combine them with different cancellation terms, meal plans and payment conditions.',
						'Plekka compares offers when those details match. When it cannot find a fair comparison, it says so. Sometimes Plekka is cheapest. Sometimes another site is. People get to see both.'
					],
					media: [
						{
							type: 'figures',
							count: 2,
							ratio: 'wide',
							captions: ['Hotel discovery', 'Room comparison']
						}
					]
				},
				{
					heading: 'The booking is the beginning',
					text: [
						'A booking contains the start of a relationship: a place, a date and a reason to travel. Most booking sites use that information to send more offers. Plekka could use it to make the trip better.',
						'That may mean a small guide made for your stay, a restaurant worth booking early or real help when plans change. A family’s first trip with a child should not feel the same as an anniversary weekend or three days away with friends.',
						'Plekka already brings saved hotels, bookings and upcoming trips together. The longer-term idea is to turn that account into a useful home for the whole trip.'
					],
					media: [
						{
							type: 'figures',
							count: 2,
							ratio: 'wide',
							captions: ['Saved hotels', 'Upcoming trips']
						}
					]
				},
				{
					heading: 'Starting with one real booking',
					text: [
						'The closed beta is focused on the foundation: can someone find a hotel, understand the comparison and feel comfortable booking through Plekka?',
						'I am now completing the booking and payment flow and preparing to test it with a small group. If that journey does not work, everything after it is decoration. If it does, Plekka has earned the right to stay useful after the payment.'
					]
				}
			]
		}),
		year: '2026',
		role: 'Founder, product design and development',
		stage: 'Preparing for closed beta',
		metaLabels: { role: 'Role' },
		link: { label: 'plekka.com', href: 'https://plekka.com' },
		highlights: [
			'Live rate comparison with other booking sites',
			'Saved hotels, bookings and upcoming trips',
			'Preparing a closed beta around one real booking'
		],
		cardSize: 'short'
	},
	{
		id: 'rolls',
		title: 'Rolls',
		meta: 'Shared camera — in development',
		description:
			'One shared camera roll for a night with friends. Take a limited number of photos and see them together later.',
		body: [
			'One shared camera roll for a night with friends. Take a limited number of photos and see them together later.',
			'The best part of a disposable camera is waiting. Nobody checks every shot or asks for a retake. The photos arrive after the night is over.'
		],
		caseStudy: productStory({
			idea: [
				'One shared camera roll for a night with friends. Take a limited number of photos and see them together later.',
				'The best part of a disposable camera is waiting. Nobody checks every shot or asks for a retake. The photos arrive after the night is over.',
				'Rolls brings that constraint to your phone. One person starts a roll and invites the group. Everyone gets a set number of photos. The roll closes at a chosen time and the photos stay hidden until they are ready.'
			],
			overview: {
				type: 'figure',
				ratio: 'ultrawide',
				src: '/media/rolls-flow.jpg',
				caption: 'The whole night, in one flow',
				background: '#111',
				framed: true,
				peek: true
			},
			beats: [
				{
					heading: 'One roll for the night',
					text: [
						'The person creating the roll chooses its name, end time and photo limit. Friends join through a link or QR code.',
						'Once inside, everyone uses the same simple camera. It shows which roll is active, who has joined and how many shots remain.'
					],
					media: [
						{
							type: 'phones',
							screens: [{ caption: 'The camera', background: '#111' }]
						}
					]
				},
				{
					heading: 'The photos can wait',
					text: [
						'Every photo goes straight into the roll. There is no preview and no live gallery.',
						'After the end time, the roll first appears as developing. When it is ready, everyone gets the same album and can see the night from the group’s point of view.'
					],
					media: [
						{
							type: 'phones',
							screens: [{ caption: 'No preview after a shot', background: '#111' }]
						},
						{
							type: 'phones',
							screens: [{ caption: 'The album', background: '#111' }]
						}
					]
				}
			],
			status:
				'We are now building the first working version. The first test is simple: will a group use Rolls for a real night out and return the next day to see the photos?'
		}),
		services: 'Concept, Product, Design',
		year: '2025 – Present',
		role: 'Concept and product design',
		highlights: [
			'Shared rolls with a photo limit',
			'No preview until the roll is ready',
			'Building the first working version'
		],
		poster: '/media/rolls-flow.jpg',
		cardSize: 'short'
	},
	{
		id: 'pomolo',
		title: 'Pomolo',
		meta: 'Coming soon',
		description: 'A fuller write-up of this project is on the way.',
		body: ['A fuller write-up of this project is on the way.'],
		comingSoon: true,
		year: '2026',
		role: 'Founder',
		video: '/media/pomolo.mp4',
		poster: '/media/pomolo.jpg',
		cardSize: 'wide'
	}
];

export function getWorkProject(id: string | null | undefined): WorkProject | undefined {
	if (!id) return undefined;
	return workProjects.find((project) => project.id === id);
}

/** Homepage mock quotes — replace with real ones when ready. */
export const testimonials = [
	{
		quote:
			'Naim has a rare mix of product taste and systems thinking. He kept the merchant experience coherent while the platform and the team scaled across markets.',
		name: 'Sarah Chen',
		role: 'VP Product',
		company: 'Adyen'
	},
	{
		quote:
			'He turns ambiguous briefs into something you can actually ship. Clear priorities, sharp critique, and no theater — just good product judgment.',
		name: 'Marcus Veld',
		role: 'Engineering Manager',
		company: 'Adyen'
	},
	{
		quote:
			'Working with Naim at Ristretto felt like having a co-founder in the room. He cared as much about the craft as about whether the thing would hold up for users.',
		name: 'Elena Rossi',
		role: 'Founder',
		company: 'Studio client'
	}
];

export type NoteBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'figure'; caption: string; ratio?: CaseFigureRatio }
	| { type: 'diagram'; kind: import('$lib/components/NoteDiagram.svelte').NoteDiagramKind }
	| { type: 'footnotes'; items: { id: string; text: string }[] };

export type Note = {
	slug: string;
	title: string;
	/** ISO date, `YYYY-MM-DD` */
	date: string;
	meta?: string;
	description: string;
	body: NoteBlock[];
};

export function noteDateParts(date: string) {
	const [year, month, day] = date.split('-');
	return { year, dayMonth: `${day}/${month}` };
}

export const notes: Note[] = [
	{
		slug: 'how-to-stay-sane-while-building-with-ai',
		title: 'How to stay sane while building with AI',
		date: '2026-08-14',
		description: 'One product, one thread.',
		body: [
			{
				type: 'paragraph',
				text: 'I had five agents open, and every tab showed progress.'
			},
			{
				type: 'paragraph',
				text: 'One was changing the data model. Another was building against the old model. A third was polishing a page I had already decided to remove. The other two needed answers before they could continue.'
			},
			{
				type: 'paragraph',
				text: 'Each agent had done more or less what I asked. Together, they had made a mess.'
			},
			{
				type: 'paragraph',
				text: 'It had started with one large task. I gave it to Claude Opus 5 or GPT 5.6 Sol, then waited. When the answer did not arrive, I opened another agent and found something useful for it to do. Soon, several parts of the product were moving at once.'
			},
			{
				type: 'paragraph',
				text: 'It looked efficient. In practice, the agents produced work faster than I could keep their assumptions aligned.'
			},
			{
				type: 'heading',
				text: 'The wait changed how I worked'
			},
			{
				type: 'paragraph',
				text: 'Long-running models can do excellent work. I still use them when I can define the outcome, leave them alone and inspect the result later.'
			},
			{
				type: 'paragraph',
				text: 'The trouble starts when I am still making product decisions. A few empty minutes give me time to open another task, but not enough time to understand a new problem. I leave the first task half-finished and return with less context than before.[^1]'
			},
			{
				type: 'paragraph',
				text: 'Every new agent also gives me more to remember: the prompt, the files it touched, the decisions it made and the decisions it needs from me. If two agents work on the same part of the product, I must reconcile their versions.'
			},
			{
				type: 'paragraph',
				text: 'I had become the manager of five fast colleagues who did not speak to each other.'
			},
			{
				type: 'heading',
				text: 'Smaller steps keep the product moving'
			},
			{
				type: 'paragraph',
				text: 'I now stay with one task and make smaller cuts.'
			},
			{
				type: 'paragraph',
				text: 'I ask for one meaningful change, run the product, inspect the result and choose the next step. When an assumption is wrong, I catch it before much has been built on top of it. When the change works, the product itself tells me what to do next.'
			},
			{
				type: 'diagram',
				kind: 'tasks'
			},
			{
				type: 'paragraph',
				text: 'This matters because I rarely know the full answer at the start. I might know what a feature should achieve, but its shape becomes clear while I use it. A button feels unnecessary. A state is missing. A flow that made sense in text feels slow on screen.'
			},
			{
				type: 'paragraph',
				text: 'A long prompt cannot reveal those things. A working product can.'
			},
			{
				type: 'paragraph',
				text: 'Several agents may finish more instructions, but a short loop gives me something more useful: a better next decision.'
			},
			{
				type: 'heading',
				text: 'Choose a rhythm that fits the work'
			},
			{
				type: 'paragraph',
				text: 'I use a long-running model for work with a clear boundary. It can investigate an isolated problem, map an unfamiliar part of the codebase or complete a change that I can review as one result.'
			},
			{
				type: 'paragraph',
				text: 'When I am shaping a feature, I prefer a quicker exchange. I want the answer to arrive while the problem is still fresh. The work then feels like building with the model instead of handing work over to it.'
			},
			{
				type: 'paragraph',
				text: 'A fast model that creates extra repair work is still slow. A powerful model can also be wasteful when the task only needs a small, careful change. I care about the whole loop: asking, waiting, checking and correcting.'
			},
			{
				type: 'paragraph',
				text: 'Part of that wait is the model checking itself. Some reach for tools constantly. They will spin up a browser and look at the page to confirm that a visual change actually landed. Others write a long account of everything they did to get there.'
			},
			{
				type: 'paragraph',
				text: 'Both habits can be worth the time, and I think the preference is personal. Mine is a speedy delivery. I keep a localhost open next to the editor, so I would rather look at the change myself than read a report about it.'
			},
			{
				type: 'paragraph',
				text: 'On a real task, that wait is not the same for every model, or even for every setting of the same model. They also write different amounts. Claude Sonnet 5 at max used 300 million output tokens to run the same index. GPT 5.6 Sol at medium used 12 million.[^2]'
			},
			{
				type: 'diagram',
				kind: 'benchmark'
			},
			{
				type: 'paragraph',
				text: 'Right now I mostly use Grok 4.5. It sits in a useful middle: fast enough that I can stay with one task, lean enough that it does not bury me in tokens, and capable enough that I do not need five agents to finish the work. That balance of speed, verbosity and cost is what lets me work sequentially. It is also what keeps me sane.'
			},
			{
				type: 'paragraph',
				text: 'I also try to stay with one model for long enough to learn its habits. I learn when it needs a narrow instruction, when it tends to overbuild and where I need to check its work. That familiarity saves more time than switching models for every small advantage.'
			},
			{
				type: 'heading',
				text: 'One product, one thread'
			},
			{
				type: 'paragraph',
				text: 'I now keep one objective in the foreground. While the model works, I inspect the diff, test the product or prepare the next request. I do not start a separate feature because a spinner gave me thirty empty seconds.'
			},
			{
				type: 'paragraph',
				text: 'There are still good reasons to let an agent work on its own. Most of my product work is too fluid for that. Each result changes what I think the next step should be.'
			},
			{
				type: 'paragraph',
				text: 'I leave a good session with a clearer product and enough context to continue. That matters more to me than a screen full of busy agents.'
			},
			{
				type: 'footnotes',
				items: [
					{
						id: '1',
						text: 'Research into [task interruption in software development](https://doi.org/10.1145/3210459.3210471) found that self-initiated task switches can be more disruptive than external interruptions.'
					},
					{
						id: '2',
						text: 'Data from [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models), 15 August 2026. Time is end-to-end response time for a 500-token reply, including thinking. Tokens are output tokens used to run the full Intelligence Index. Intelligence is the Artificial Analysis Intelligence Index score.'
					}
				]
			}
		]
	},
	{
		slug: 'build-the-rough-version-first',
		title: 'Build the rough version first',
		date: '2026-08-15',
		description: 'A working version argues back. A static screen does not.',
		body: [
			{
				type: 'paragraph',
				text: 'AI can produce a polished mistake at impressive speed.'
			},
			{
				type: 'paragraph',
				text: 'For years, I started most product work in Figma. I still use it, but often later in the process. When I build with AI, I begin with a rough working flow.'
			},
			{
				type: 'paragraph',
				text: 'The first version can be ugly. It can use plain buttons, poor spacing, and the wrong typeface. It only needs to let me use the idea.'
			},
			{
				type: 'paragraph',
				text: 'A static screen lets me imagine that a flow works. A working version argues back.'
			},
			{
				type: 'heading',
				text: 'The product appears between the screens'
			},
			{
				type: 'paragraph',
				text: 'I usually start in Cursor, Claude Code, or Codex. I ask for the shortest version of the main journey. I spend few tokens on visual design.'
			},
			{
				type: 'paragraph',
				text: 'Then I use it.'
			},
			{
				type: 'paragraph',
				text: 'That is when the missing work appears.'
			},
			{
				type: 'paragraph',
				text: 'What happens while the page loads? Can I go back without losing my choices? What does an empty account look like? What if the API fails after the user has paid? Is this second step doing any useful work?'
			},
			{
				type: 'diagram',
				kind: 'gaps'
			},
			{
				type: 'paragraph',
				text: 'These questions are easy to miss when every screen is a tidy frame. They become hard to ignore when I must click through the product myself.'
			},
			{
				type: 'paragraph',
				text: 'AI makes this loop much faster. I can change the order, remove a step, or replace the whole approach before I have invested much in it.'
			},
			{
				type: 'paragraph',
				text: 'That only works if I let the first version remain disposable.'
			},
			{
				type: 'heading',
				text: 'Polish what survives'
			},
			{
				type: 'paragraph',
				text: 'I return to Figma when the flow stops changing every ten minutes.'
			},
			{
				type: 'paragraph',
				text: 'At that point, I know which screens matter. I know where the product needs hierarchy and where it needs restraint. I can work on type, spacing, motion, and details without using visual design to cover a weak idea.'
			},
			{
				type: 'paragraph',
				text: 'My order of work now looks like this:'
			},
			{
				type: 'list',
				items: [
					'Build the shortest working journey.',
					'Use it as if it were already live.',
					'fix the problems I can feel.',
					'Remove a step.',
					'Design the version that survived.'
				]
			},
			{
				type: 'paragraph',
				text: 'The sequence is not strict. I still sketch and explore. I still move between code and Figma. The important part is that polish comes after contact with the product.'
			},
			{
				type: 'paragraph',
				text: 'AI makes software easier to create. It also makes it easier to create too much of the wrong thing.'
			},
			{
				type: 'paragraph',
				text: 'The rough version protects me from that. It lets me touch the idea before I start admiring it.'
			}
		]
	},
	{
		slug: 'when-a-familiar-product-changes-overnight',
		title: 'What happens when a familiar product changes overnight',
		date: '2025-02-04',
		description: 'The product may change overnight. The organisation cannot.',
		body: [
			{
				type: 'paragraph',
				text: 'When we launched a new navigation for Adyen’s merchant platform, Support told us something I had not considered: some merchants had turned the old interface into printed manuals for their employees.'
			},
			{
				type: 'paragraph',
				text: 'They were positive about the changes. They still wished they had known earlier.'
			},
			{
				type: 'paragraph',
				text: 'Their screenshots were now out of date. Employees who knew the old routes needed new instructions. Internal support teams had to prepare for questions. What looked like a product release to us had become a training project for them.'
			},
			{
				type: 'heading',
				text: 'The product extended beyond the browser'
			},
			{
				type: 'paragraph',
				text: 'Our team had lived with the new navigation for months. We saw each iteration and understood why things had moved. By launch, the result already felt normal.'
			},
			{
				type: 'paragraph',
				text: 'Merchants skipped that journey. They saw the accumulated change during their next login.'
			},
			{
				type: 'paragraph',
				text: 'Their experience included more than the screens we designed. It also lived in memory, internal processes, training sessions, and one employee showing another where to click.'
			},
			{
				type: 'paragraph',
				text: 'Research into interface habits helps explain why this matters. Repeated use makes people faster and more accurate. When familiar cues move, that advantage can disappear.[^1]'
			},
			{
				type: 'paragraph',
				text: 'Support saw the wider effect. They heard how one interface change travelled through an organisation.'
			},
			{
				type: 'paragraph',
				text: 'They asked to hear about large releases earlier.'
			},
			{
				type: 'heading',
				text: 'Search gave us another chance'
			},
			{
				type: 'paragraph',
				text: 'Support knew that we were also preparing a new payment search. This time, we planned the release together.'
			},
			{
				type: 'paragraph',
				text: 'The new search started as an opt-in experience. We then enabled it for a small percentage of merchants and increased that percentage in stages.[^3] The early groups exposed problems that we could fix before the release grew.'
			},
			{
				type: 'paragraph',
				text: 'Support identified merchants who needed advance communication. We kept those accounts until the final stages, giving their teams time to prepare.'
			},
			{
				type: 'paragraph',
				text: 'We also kept the old search available for a limited period. If the new version blocked someone’s work, they could return and finish the task. Switching back gave us a useful signal about where the new experience still failed.[^4]'
			},
			{
				type: 'paragraph',
				text: 'Research into interface transitions found that people can perform worse immediately after moving to a design that will make them faster later. Intermediate versions can reduce that initial drop.[^2] Our rollout gave merchants time to cross that gap.'
			},
			{
				type: 'paragraph',
				text: 'A gradual release created one more problem: different accounts could now see different versions. We made the active version visible to internal users. Support could see what the merchant saw before giving instructions.'
			},
			{
				type: 'heading',
				text: 'Support moved upstream'
			},
			{
				type: 'paragraph',
				text: 'From then on, Support joined our planning sessions and demos. Before every large release, we held a dedicated meeting to agree on the rollout and merchant communication.'
			},
			{
				type: 'paragraph',
				text: 'The relationship changed beyond releases. Support began bringing merchant problems into our roadmap earlier and more often. We gained a closer connection to the people who heard those problems first.'
			},
			{
				type: 'paragraph',
				text: 'Feature flags gave us control over who received a change. Support helped us understand when and how to use that control.'
			},
			{
				type: 'paragraph',
				text: 'At enterprise scale, a release replaces more than an interface. It asks an organisation to replace part of what it knows.'
			},
			{
				type: 'paragraph',
				text: 'The product may change overnight. The organisation cannot.'
			},
			{
				type: 'footnotes',
				items: [
					{
						id: '1',
						text: 'Diego Garaialde et al. found that stable interface cues make people faster and more accurate, and that this gain disappears when those cues are disrupted. [Quantifying the Impact of Making and Breaking Interface Habits](https://www.sciencedirect.com/science/article/abs/pii/S107158192030063X), 2020.'
					},
					{
						id: '2',
						text: 'Benjamin Rosman et al. found that switching interfaces can cause a sharp drop in performance, even when the new interface becomes more efficient once learned. Intermediate versions reduced that drop. [On User Behaviour Adaptation Under Interface Change](https://www.microsoft.com/en-us/research/publication/user-behaviour-adaptation-interface-change/), 2014.'
					},
					{
						id: '3',
						text: 'A staged release was also how Google approached a launch at this scale. [Minimizing Change Aversion for the Google Drive Launch](https://research.google/pubs/minimizing-change-aversion-for-the-google-drive-launch/), Google Research, 2013.'
					},
					{
						id: '4',
						text: 'Spotify combined behavioural and attitudinal data to separate a temporary reaction to change from a real problem with a redesign. [Minimizing Change Aversion Through Mixed Methods Research](https://research.atspotify.com/publications/minimizing-change-aversion-through-mixed-methods-research-a-case-study-of-redesigning-spotifys-your-library), Spotify Research, 2023.'
					}
				]
			}
		]
	},
	{
		slug: 'adoption-is-a-convenience-problem',
		title: 'Adoption is a convenience problem',
		date: '2025-10-16',
		description: 'People avoid shared tools when using them creates more work.',
		body: [
			{
				type: 'paragraph',
				text: 'When I became responsible for the design system at Adyen, there was no dedicated team behind it. An early style guide existed in Sketch and CSS, but many states and larger patterns were missing.'
			},
			{
				type: 'paragraph',
				text: 'I carried the work with designers and engineers who volunteered time alongside their main jobs. We all agreed that the product needed more consistency. Agreement was never the hard part.'
			},
			{
				type: 'paragraph',
				text: 'The hard part was Tuesday afternoon, when a team needed to ship and the system did not have what they needed.'
			},
			{
				type: 'paragraph',
				text: 'They could wait for us or make something themselves. The second option usually won.'
			},
			{
				type: 'diagram',
				kind: 'deadline'
			},
			{
				type: 'heading',
				text: 'The next deadline always wins'
			},
			{
				type: 'paragraph',
				text: 'We documented the system and presented it across the company. That helped people understand what was available. It did not make an incomplete system more useful.'
			},
			{
				type: 'paragraph',
				text: 'Adoption improved when we worked on problems teams already had: missing states, navigation, account structures and patterns for common pages. Reusing the system slowly became faster than starting again.'
			},
			{
				type: 'paragraph',
				text: 'This changed how I thought about adoption. People rarely reject shared tools because they enjoy inconsistency. They avoid them when using them creates more work.'
			},
			{
				type: 'paragraph',
				text: 'If teams keep making their own version, the problem may not be alignment. The shared solution may still be too expensive.'
			},
			{
				type: 'heading',
				text: 'A volunteer system has a ceiling'
			},
			{
				type: 'paragraph',
				text: 'The volunteer model had real benefits. Designers and engineers from different product teams brought actual problems into the system. They understood why decisions had been made and could see their own work reflected in it.'
			},
			{
				type: 'paragraph',
				text: 'It also meant that system work happened after product work.'
			},
			{
				type: 'paragraph',
				text: 'When a deadline moved, the volunteer returned to their main team. Maintenance, documentation and larger improvements had to wait. Important decisions depended on who happened to have time that week.'
			},
			{
				type: 'paragraph',
				text: 'Nobody was doing anything wrong. The design system simply had no protected capacity.'
			},
			{
				type: 'paragraph',
				text: 'That changed when Adyen created a dedicated team. Components received sustained attention. Decisions no longer had to fit between other commitments. The team could plan ahead, support product teams and maintain both the design and code libraries.'
			},
			{
				type: 'paragraph',
				text: 'Everything became easier.'
			},
			{
				type: 'paragraph',
				text: 'A dedicated team did not make contributions from other teams less important. It gave those contributions somewhere to go.'
			},
			{
				type: 'paragraph',
				text: 'Community gave the system relevance. The dedicated team gave it continuity.'
			},
			{
				type: 'heading',
				text: 'People still want to create'
			},
			{
				type: 'paragraph',
				text: 'Convenience only explains part of adoption.'
			},
			{
				type: 'paragraph',
				text: 'Designers and engineers do not want to spend their careers assembling someone else’s LEGO set. They are creators. They see product and technical problems that a central team cannot predict, and they want to influence the tools they use.'
			},
			{
				type: 'paragraph',
				text: 'A closed system can be quick to use until it no longer fits. Teams then work around it, create local components or force new behaviour into an old pattern.'
			},
			{
				type: 'paragraph',
				text: 'Opening every decision to everyone creates a different problem. The library fills with local preferences and stops offering clear defaults.'
			},
			{
				type: 'paragraph',
				text: 'The dedicated team became the steward of the system. Product teams remained contributors. That balance mattered.'
			},
			{
				type: 'paragraph',
				text: 'Convenience creates usage. Ownership creates commitment.'
			},
			{
				type: 'heading',
				text: 'Ownership needs a route'
			},
			{
				type: 'paragraph',
				text: 'Ownership does not mean accepting every request. It means people know how they can challenge and improve a decision.'
			},
			{
				type: 'paragraph',
				text: 'A contribution should start with a real product problem. The team first checks whether an existing pattern can solve it. If that pattern fails, they explain where it fails and test another solution in the product.'
			},
			{
				type: 'paragraph',
				text: 'When the need is likely to return elsewhere, the dedicated team can bring the solution into the system.'
			},
			{
				type: 'paragraph',
				text: 'The product team supplies context and evidence. The system team checks quality, accessibility and wider use. Both remain involved.'
			},
			{
				type: 'paragraph',
				text: 'This lets people contribute without turning the library into a collection of exceptions.'
			},
			{
				type: 'heading',
				text: 'Contributions need a moment'
			},
			{
				type: 'paragraph',
				text: 'A contribution can disappear surprisingly quickly. A new pattern gets reviewed, renamed and added to the library. The system improves, but the person behind the work becomes invisible.'
			},
			{
				type: 'paragraph',
				text: 'That is a missed opportunity.'
			},
			{
				type: 'paragraph',
				text: 'People should be able to point at part of the system and say, “I helped make that.” This creates pride. It also shows others that contribution is welcome and worth the effort.'
			},
			{
				type: 'paragraph',
				text: 'Celebration does not need a ceremony. Show the work in a team demo. Name the designer and engineer in the changelog. Explain which product problem they solved and where the new pattern can now help others.'
			},
			{
				type: 'paragraph',
				text: 'This was especially important while the system relied on volunteers. They were spending time outside their main responsibilities. Recognition made that work visible.'
			},
			{
				type: 'paragraph',
				text: 'A dedicated team should continue to publish the names and stories behind contributions. Otherwise, shared work can slowly look like the output of one central group.'
			},
			{
				type: 'heading',
				text: 'Measure pull'
			},
			{
				type: 'paragraph',
				text: 'A company can require teams to use a design system. That produces usage, but it does not prove that the system is healthy.'
			},
			{
				type: 'paragraph',
				text: 'A healthy system has pull. Teams ask about a missing state before making their own. They report bugs in shared components. They bring useful patterns back from product work. Contributors return because the first contribution felt worthwhile.'
			},
			{
				type: 'paragraph',
				text: 'Local copies and quiet workarounds are useful signals too. They show where the shared system has stopped helping.'
			},
			{
				type: 'paragraph',
				text: 'The strongest sign of adoption is simple: people choose the system when nobody is checking.'
			},
			{
				type: 'heading',
				text: 'Make it easy to use and worth caring about'
			},
			{
				type: 'paragraph',
				text: 'If I started a design system today, I would protect a small team early. I would also keep the contribution path open and make good contributions visible.'
			},
			{
				type: 'paragraph',
				text: 'The dedicated team should remove the burden of maintenance from volunteers. It should preserve their influence and give them credit.'
			},
			{
				type: 'paragraph',
				text: 'At Adyen, the system became real when designers and engineers reached for it during product work. It saved time, and they could still help decide where it went next. They could also feel proud when their work became useful to people outside their own team.'
			},
			{
				type: 'paragraph',
				text: 'The goal was to stop repeating settled decisions, so teams had more time for problems that were still new.'
			}
		]
	}
];

const noteAliases: Record<string, string> = {
	'change-has-a-budget': 'when-a-familiar-product-changes-overnight'
};

export function getNote(slug: string | null | undefined): Note | undefined {
	if (!slug) return undefined;
	const resolved = noteAliases[slug] ?? slug;
	return notes.find((note) => note.slug === resolved);
}

export const elsewhere = [
	{
		label: 'Connect with me on',
		href: 'https://www.linkedin.com/in/naimchayata/',
		platform: 'LinkedIn'
	},
	{
		label: 'Find shots on',
		href: 'https://dribbble.com/chayata',
		platform: 'Dribbble'
	}
];

export const roles = [
	{
		title: 'Founder',
		company: 'Mayfold',
		dates: 'May 2025 – Present',
		description:
			'Mayfold is my personal product lab, where I spend spare time building and experimenting with AI-enabled products. It helps me learn new tools, test ideas, stay hands-on across product, design, implementation.',
		cards: 2
	},
	{
		title: 'UX Manager',
		company: 'Adyen',
		dates: 'Jan 2024 – May 2025',
		description:
			'Led a multidisciplinary team of designers, writers, and researchers on the merchant-facing core of the platform. Set the product narrative, protected focus, and kept the experience coherent across languages and markets.'
	},
	{
		title: 'Product Design Manager',
		company: 'Adyen',
		dates: 'Sep 2022 – Jan 2024',
		description:
			'Built out the design team and led design on the merchant product. A lot of it was saying no so the experience stayed coherent while we shipped across markets.'
	},
	{
		title: 'Engineering Team Lead',
		company: 'Adyen',
		dates: 'Jun 2021 – Sep 2022',
		description:
			'Led design, frontend, and backend on the Customer Area. We replaced search with something faster and more reliable for large merchants. I was the glue between product intent and what actually shipped.',
		cards: 2
	},
	{
		title: 'Principal Product Designer + Design System Lead',
		company: 'Adyen',
		dates: 'Jun 2018 – Jun 2021',
		description:
			'Started on payment methods and bulk settings. Then owned the first design system and a chunk of the platform: navigation, accounts, multi-account flows. A lot of that is still in the product.',
		cards: 2
	},
	{
		title: 'Co-founder',
		company: 'Ristretto',
		dates: 'Jul 2015 – Jan 2022',
		description:
			'Co-founded a product studio in Utrecht. Built with Randstad, Tempo-Team, museums, and startups. This ran in parallel with Adyen for a few years before I went full-time there.'
	},
	{
		title: 'Visual Designer',
		company: 'Yummygum',
		dates: 'Mar 2015 – Jun 2015',
		description:
			'Digital product agency in Amsterdam. Short stretch designing product UI for tech scale-ups, right before starting Ristretto.'
	},
	{
		title: 'Product Designer',
		company: 'INTK',
		dates: 'Sep 2014 – Jan 2015',
		description:
			'Digital strategies for cultural organizations in Utrecht. Early product design work, including museum projects with Teylers.'
	}
];
