export const profile = {
	name: 'Naim Chayata',
	location: 'Utrecht, The Netherlands',
	headline: 'Product Builder · Former UX Manager at Adyen',
	bioLead: [
		{ text: 'Hi. I’m Naim Chayata, a designer in Utrecht who sometimes writes code.', bold: false }
	],
	bioRest: [
		{
			text: 'Right now I’m building Mayfold: AI fashion photos for brands, with the bar that you can’t tell they were generated. Before that I spent almost seven years at Adyen, last as UX Manager. Earlier I co-founded Ristretto, a product studio.',
			bold: false
		}
	],
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

export type WorkProject = {
	id: string;
	title: string;
	meta: string;
	description: string;
	/** Headline over the full-bleed media (e.g. "Founder at Mayfold") */
	overlayHeadline?: string;
	/** Longer copy shown in the project sheet */
	body: string[];
	services: string;
	year: string;
	role?: string;
	/** Short mock highlights for the project overlay */
	highlights?: string[];
	link?: { label: string; href: string };
	/** Looping muted video used as card / thumb media */
	video?: string;
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
		video: '/media/adyen.mp4',
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
		video: '/media/plekka.mp4',
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
		video: '/media/mayfold.mp4',
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
		title: 'UX + Product Design Manager',
		company: 'Adyen',
		dates: 'Sep 2022 – May 2025',
		description:
			'Built out the design team and later led design, writing, and research on the merchant-facing product. A lot of it was saying no so the experience stayed coherent while we shipped across markets.'
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
	}
];
