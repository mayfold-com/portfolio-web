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
	{ href: '/craft', label: 'Craft' },
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
			'Building Mayfold, an AI photography tool for fashion brands. Most of the work is on control: same product, same pose, different outfits, without the usual AI tells.',
		body: [
			'Mayfold is my personal product lab for AI-enabled products. The main thread is fashion photography that holds up next to real shoots — consistency, fabric, light — not one-off demos.',
			'I use it to stay hands-on across product, design, and implementation, and to test ideas without waiting on a brief.'
		],
		comingSoon: true,
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

export const craftNotes = [
	{
		title: 'Design systems in a growing product',
		meta: 'Practice',
		description:
			'What stuck from Adyen’s first design system: which parts aged well, and which we had to rip out once the product got bigger.'
	},
	{
		title: 'Making AI photos briefable',
		meta: 'Mayfold',
		description:
			'Consistency, fabric, light. The boring stuff that decides whether a generated image is usable twice in a row.'
	},
	{
		title: 'Working with almost no brief',
		meta: 'Studio',
		description:
			'Notes from Ristretto and Mayfold on starting when the problem isn’t clear yet, and how not to fake certainty.'
	}
];

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
