export const profile = {
	name: 'Naim Chayata',
	location: 'Utrecht, The Netherlands',
	/** Two-line hero. Soft break is intentional. */
	title: 'Hi. I’m Naim, a designer\nwho loves to build',
	subline:
		'I build products from Utrecht. Right now that is Mayfold, helping fashion brands make photos that don’t look generated. Before that I spent almost seven years at Adyen, last as UX Manager.',
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
export type CaseFigureRatio = 'wide' | 'square' | 'tall' | 'ultrawide';

export type CaseStudyBlock =
	| { type: 'heading'; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'figure'; ratio?: CaseFigureRatio; caption?: string }
	| { type: 'figures'; ratio?: CaseFigureRatio; count: 2 | 3; captions?: string[] };

export type WorkProject = {
	id: string;
	title: string;
	meta: string;
	description: string;
	/** Headline over the full-bleed media (e.g. "Founder at Mayfold") */
	overlayHeadline?: string;
	/** Longer copy shown in the project sheet */
	body: string[];
	/** Optional long-form case study blocks (headings, copy, grey figures). */
	caseStudy?: CaseStudyBlock[];
	services: string;
	year: string;
	role?: string;
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
		meta: 'Design & product leadership — 2018–2025',
		description:
			'Almost seven years on the merchant product — design system, Customer Area, then team lead and management as the platform grew across markets.',
		body: [
			'Almost seven years on Adyen’s merchant-facing product — from design system and platform shell through Customer Area leadership and UX management.',
			'A lot of the work was keeping the experience coherent while the product and team scaled across markets.'
		],
		caseStudy: [
			{
				type: 'heading',
				text: 'The brief in one line'
			},
			{
				type: 'paragraph',
				text: 'Adyen’s merchant products have to feel like one company even when dozens of teams ship into the same shell. Over nearly seven years I moved from foundations (design system, platform chrome) into Customer Area leadership and eventually UX management — always with the same constraint: coherence at scale.'
			},
			{
				type: 'paragraph',
				text: 'This case study is mock content to pressure-test a longer project format. The grey blocks stand in for product shots, flows, and system artifacts.'
			},
			{
				type: 'figure',
				ratio: 'ultrawide',
				caption: 'Platform overview — placeholder'
			},
			{
				type: 'heading',
				text: 'Design system as infrastructure'
			},
			{
				type: 'paragraph',
				text: 'The first years were about making the system real: components that teams would actually adopt, documentation that didn’t rot, and a platform shell (navigation, accounts, multi-account) sturdy enough to survive product growth.'
			},
			{
				type: 'paragraph',
				text: 'What mattered less was visual polish in isolation. What mattered more was which decisions aged well — tokens, composition patterns, and the boring rules that keep a global product from fracturing market by market.'
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'wide',
				captions: ['Component inventory — placeholder', 'Shell navigation — placeholder']
			},
			{
				type: 'figure',
				ratio: 'wide',
				caption: 'Token / theming exploration — placeholder'
			},
			{
				type: 'heading',
				text: 'Customer Area: the daily hub'
			},
			{
				type: 'paragraph',
				text: 'Later the work concentrated on Customer Area — where merchants live day to day. Search, multi-account, and the shared shell became the battleground: every feature team wanted a doorway, and someone had to keep the building upright.'
			},
			{
				type: 'paragraph',
				text: 'Leading across design and engineering meant being specific about tradeoffs. Replacing search wasn’t a UI refresh; it was a bet on how merchants find things when the catalog of capabilities doubles.'
			},
			{
				type: 'figure',
				ratio: 'tall',
				caption: 'Search & discovery flow — placeholder'
			},
			{
				type: 'figures',
				count: 3,
				ratio: 'square',
				captions: ['Account switcher', 'Empty states', 'Dense tables']
			},
			{
				type: 'heading',
				text: 'Leadership without losing the craft'
			},
			{
				type: 'paragraph',
				text: 'As UX Manager the job shifted: hiring, rituals, critique quality, and protecting focus for the people closest to the pixels. The craft didn’t disappear — it moved upstream into how we framed problems and reviewed work.'
			},
			{
				type: 'paragraph',
				text: 'A useful tension stayed constant: ship with the business, but don’t let short-term surfaces erase the system. Mock quote for layout: “If every squad invents its own navigation metaphor, merchants pay the tax.”'
			},
			{
				type: 'figure',
				ratio: 'wide',
				caption: 'Team / process artifact — placeholder'
			},
			{
				type: 'figure',
				ratio: 'ultrawide',
				caption: 'Before / after composition — placeholder'
			},
			{
				type: 'heading',
				text: 'Outcomes (mock)'
			},
			{
				type: 'paragraph',
				text: 'Design system foundations still present in merchant surfaces years later. Customer Area search and multi-account patterns adopted across squads. A design org that could critique and ship without waiting on a single bottleneck.'
			},
			{
				type: 'paragraph',
				text: 'The longer lesson for this portfolio format: case studies need room for sequence — problem, system, product, people — not just a hero and three bullets.'
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'tall',
				captions: ['Mobile shell — placeholder', 'Desktop density — placeholder']
			}
		],
		services: 'Product Design, Design Systems, Leadership',
		year: '2018 – 2025',
		overlayHeadline: 'UX leadership at Adyen',
		role: 'UX Manager → Principal Designer',
		highlights: [
			'Scaled design systems across merchant surfaces',
			'Led Customer Area product experience',
			'Grew and managed multidisciplinary teams'
		],
		link: { label: 'adyen.com', href: 'https://www.adyen.com' },
		video: '/media/adyen.mp4?v=1080',
		poster: '/media/adyen-poster.jpg?v=1080',
		cardSize: 'mid'
	},
	{
		id: 'plekka',
		title: 'Plekka',
		meta: 'Online Travel Agency — website',
		description:
			'An online travel agency for browsing destinations, comparing stays, and booking trips without the usual booking-flow friction.',
		overlayHeadline: 'Product design at Plekka',
		body: [
			'Plekka is an online travel agency website built around finding and booking trips with less friction — destinations, stays, and the path to checkout.',
			'The work covered product design and the site experience: clear search, readable listings, and a booking flow that stays calm when the inventory gets dense.'
		],
		services: 'Product Design, Brand, Engineering',
		year: '2024',
		role: 'Product & Design',
		highlights: [
			'Destination search and stay comparison',
			'Booking flow with less checkout friction',
			'Responsive marketing + product surfaces'
		],
		cardSize: 'short'
	},
	{
		id: 'mayfold',
		title: 'Mayfold',
		meta: 'Founder — 2025–Present',
		description:
			'Building Mayfold, an AI photography tool for fashion brands. Most of the work is on control: same product, same pose, different outfits, without the usual AI tells.',
		overlayHeadline: 'Founder at Mayfold',
		body: [
			'Mayfold is my personal product lab for AI-enabled products. The main thread is fashion photography that holds up next to real shoots — consistency, fabric, light — not one-off demos.',
			'I use it to stay hands-on across product, design, and implementation, and to test ideas without waiting on a brief.'
		],
		services: 'Product, Design, Engineering',
		year: '2025 – Present',
		role: 'Founder',
		highlights: [
			'AI fashion photography pipelines',
			'End-to-end product experiments',
			'Design + engineering in one loop'
		],
		link: { label: 'mayfold.com', href: 'https://mayfold.com' },
		cardSize: 'tall'
	},
	{
		id: 'customer-area',
		title: 'Customer Area',
		meta: 'Adyen — 2021–2022',
		description:
			'Led design and engineering on the merchant hub — replacing search, tightening multi-account flows, and keeping the shell coherent as teams shipped into it.',
		overlayHeadline: 'Customer Area at Adyen',
		body: [
			'The Customer Area is where merchants live day to day. I led design, frontend, and backend while we replaced search and cleaned up multi-account flows.',
			'Most of the job was being the glue between product intent and what actually shipped into a shared shell.'
		],
		services: 'Product Design, Engineering Leadership',
		year: '2021 – 2022',
		role: 'Engineering Team Lead',
		highlights: [
			'Rebuilt merchant search for scale',
			'Multi-account navigation cleanup',
			'Cross-functional delivery ownership'
		],
		link: { label: 'adyen.com', href: 'https://www.adyen.com' },
		cardSize: 'tall'
	},
	{
		id: 'design-system',
		title: 'Design System',
		meta: 'Adyen — 2018–2021',
		description:
			'Adyen’s first design system and a chunk of the platform shell — navigation, accounts, multi-account. A lot of that is still in the product today.',
		overlayHeadline: 'Design system at Adyen',
		body: [
			'Owned Adyen’s first design system and a large piece of the platform shell — navigation, accounts, multi-account flows.',
			'The useful lesson was which foundations aged well, and which we had to rip out once the product got bigger.'
		],
		services: 'Design Systems, Product Design',
		year: '2018 – 2021',
		role: 'Design System Lead',
		highlights: [
			'Foundational component library',
			'Platform shell: nav & accounts',
			'Adoption across merchant product teams'
		],
		link: { label: 'adyen.com', href: 'https://www.adyen.com' },
		cardSize: 'mid'
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
		title: 'Principal Designer + Design System Lead',
		company: 'Adyen',
		dates: 'Jun 2018 – Jun 2021',
		description:
			'Started on payment methods and bulk settings. Then owned the first design system and a chunk of the platform shell: navigation, accounts, multi-account flows. A lot of that is still in the product.',
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
