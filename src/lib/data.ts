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
	  };

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
		meta: 'Merchant platform — 2018–2025',
		description:
			'Almost seven years at Adyen. I touched almost all areas of our merchant-facing products and most of our internal tooling.',
		body: [
			'Almost seven years at Adyen.',
			'I touched almost all areas of our merchant-facing products and most of our internal tooling.'
		],
		caseStudy: [
			{
				type: 'paragraph',
				text: 'I spent almost seven years at Adyen on our merchant-facing products. I touched almost all of them, and most of our internal tooling. The thread through that time was structure: how teams built UI, how merchants moved through the product, and how pages stayed consistent as we grew.'
			},
			{
				type: 'paragraph',
				text: 'The product grew faster than its structure. Teams shipped new pages every week. The top navigation filled up until it could not hold another item. Create flows often sat alone in the menu, away from their lists. Opening a record meant a side panel in one place, a modal in another, a full page or a new tab somewhere else. Merchants had to learn each area from scratch.'
			},
			{
				type: 'heading',
				text: 'Design system'
			},
			{
				type: 'paragraph',
				text: 'In my first week the design system was a Sketch sticker sheet and a CSS file. Almost no component states. I owned the move to Adyen’s first full design system, with docs next to it. The hard part was not the Figma file. It was making the shared path easier than building something custom.'
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'wide',
				captions: ['Component example in Figma', 'Design system docs'],
				srcs: [
					'/media/adyen-design-system-figma.png',
					'/media/adyen-design-system-docs.png'
				],
				framed: [true, true],
				peek: [false, true]
			},
			{
				type: 'heading',
				text: 'Navigation and structure'
			},
			{
				type: 'paragraph',
				text: 'We replaced the top bar with a vertical menu with groups. We rebuilt account data and multi-account flows, and we localized the product into French, German, Brazilian Portuguese, Japanese, and Chinese. The new navigation did not land in one release. Old pages stayed on old tech for years. We migrated them while the product kept shipping.'
			},
			{
				type: 'figure',
				ratio: 'wide',
				src: '/media/adyen-navigation-redesign.png',
				framed: true,
				peek: false,
				caption: 'Navigation redesign'
			},
			{
				type: 'paragraph',
				text: 'No one had mapped the full product, so we drew the first UX sitemap. It showed duplicate paths, create flows with no list, and corners almost no one knew about. We used that map to shape the information architecture around objects: list, create, detail. Then we built global search for the cases where the menu was still not enough.'
			},
			{
				type: 'figure',
				ratio: 'wide',
				src: '/media/adyen-navigation-proposal.jpg',
				framed: true,
				peek: false,
				caption: 'Navigation proposal'
			},
			{
				type: 'figure',
				ratio: 'ultrawide',
				caption: 'UX sitemap'
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'wide',
				captions: ['Account data', 'Global search']
			},
			{
				type: 'heading',
				text: 'Leading the team'
			},
			{
				type: 'paragraph',
				text: 'As an engineering team lead I owned the navigation and search. Two product managers often needed the same engineers, so we split the team into two workstreams. We also shipped Essentials, the franchisee platform, for merchants who did not need the full product.'
			},
			{
				type: 'paragraph',
				text: 'As a UX manager I ran Project Boost: shared templates for list, create, and detail pages. The goal was simple. Stop a new layout for every object. I also led designers, writers, and researchers across Checkout, developer documentation, reporting, and reconciliation.'
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'wide',
				captions: ['Boost templates', 'Franchisee platform']
			},
			{
				type: 'figures',
				count: 2,
				ratio: 'wide',
				captions: ['Checkout', 'Reporting']
			},
			{
				type: 'paragraph',
				text: 'What lasted was the structural work: a design system teams could use, navigation that could grow, a shared map of the product, search, and page templates. Everything else waited on migration.'
			}
		],
		services: 'Product Design, Design Systems, Leadership',
		year: '2018 – 2025',
		role: 'Principal Designer, Design System Lead, Engineering Team Lead, UX Manager',
		highlights: [
			'Design system, navigation, and search',
			'Account data, localization, and internal tooling',
			'Franchisee platform, Checkout, docs, and reporting'
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
		body: [
			'Plekka is an online travel agency website built around finding and booking trips with less friction — destinations, stays, and the path to checkout.',
			'The work covered product design and the site experience: clear search, readable listings, and a booking flow that stays calm when the inventory gets dense.'
		],
		comingSoon: true,
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
		cardSize: 'tall'
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
