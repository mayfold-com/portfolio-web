export type FontId =
	| 'inter'
	| 'geist'
	| 'geist-pixel'
	| 'miranda-sans'
	| 'google-sans'
	| 'gabarito'
	| 'alpha-lyrae'
	| 'opening-hours-sans'
	| 'aspekta'
	| 'overused-grotesk'
	| 'switzer'
	| 'funnel-sans'
	| 'pilar'
	| 'soehne';

export type FontOption = {
	id: FontId;
	label: string;
	family: string;
	/** Optional variation settings (e.g. Geist Pixel shape axis) */
	variation?: string;
	/** OpenType feature settings */
	features?: string;
};

export const fonts: FontOption[] = [
	{
		id: 'inter',
		label: 'Inter',
		family: 'Inter'
	},
	{
		id: 'geist',
		label: 'Geist',
		family: 'Geist'
	},
	{
		id: 'geist-pixel',
		label: 'Geist Pixel',
		family: 'Geist Pixel',
		variation: '"ELSH" 1'
	},
	{
		id: 'miranda-sans',
		label: 'Miranda Sans',
		family: 'Miranda Sans'
	},
	{
		id: 'google-sans',
		label: 'Google Sans',
		family: 'Google Sans'
	},
	{
		id: 'gabarito',
		label: 'Gabarito',
		family: 'Gabarito'
	},
	{
		id: 'alpha-lyrae',
		label: 'Alpha Lyrae',
		family: 'Alpha Lyrae',
		/* calt is the designed mix: roughly every 4th glyph goes pixel/glitch; dlig for pixel ligatures */
		features: '"calt" 1, "dlig" 1'
	},
	{
		id: 'opening-hours-sans',
		label: 'Opening Hours Sans',
		family: 'Opening Hours Sans'
	},
	{
		id: 'aspekta',
		label: 'Aspekta',
		family: 'Aspekta'
	},
	{
		id: 'overused-grotesk',
		label: 'Overused Grotesk',
		family: 'Overused Grotesk'
	},
	{
		id: 'switzer',
		label: 'Switzer',
		family: 'Switzer'
	},
	{
		id: 'funnel-sans',
		label: 'Funnel Sans',
		family: 'Funnel Sans'
	},
	{
		id: 'pilar',
		label: 'Pilar',
		family: 'FT Pilar'
	},
	{
		id: 'soehne',
		label: 'Söhne',
		family: 'Söhne'
	}
];

export const defaultFontId: FontId = 'soehne';
export const fontStorageKey = 'naim-font';
export const fontWeightStorageKey = 'naim-font-weight';
export const defaultFontWeight = 400;

export const fontWeights = [
	{ value: 300, label: '300 — Light' },
	{ value: 400, label: '400 — Regular' },
	{ value: 500, label: '500 — Medium' },
	{ value: 600, label: '600 — SemiBold' },
	{ value: 700, label: '700 — Bold' },
	{ value: 800, label: '800 — ExtraBold' }
] as const;

export type FontWeight = (typeof fontWeights)[number]['value'];

/** Google Fonts CSS URL for remote picker options. */
export const fontsStylesheetHref =
	'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Geist:wght@300;400;500;600;700;800&family=Geist+Pixel&family=Miranda+Sans:wght@400;500;600;700&family=Google+Sans:wght@400;500;600;700&family=Gabarito:wght@400;500;600;700;800;900&family=Funnel+Sans:wght@300;400;500;600;700;800&display=swap';

/** Fontshare CSS URL for Switzer. */
export const fontshareStylesheetHref =
	'https://api.fontshare.com/v2/css?f[]=switzer@1,2,3,4,5,6,7&display=swap';

export function isFontId(value: string | null | undefined): value is FontId {
	return fonts.some((font) => font.id === value);
}

export function isFontWeight(value: string | number | null | undefined): value is FontWeight {
	const n = typeof value === 'string' ? Number(value) : value;
	return fontWeights.some((weight) => weight.value === n);
}

export function getFont(id: FontId): FontOption {
	return fonts.find((font) => font.id === id) ?? fonts[0];
}

export function applyFont(id: FontId) {
	const font = getFont(id);
	const root = document.documentElement;

	root.dataset.font = font.id;
	root.style.setProperty('--font', `'${font.family}', sans-serif`);

	if (font.variation) {
		root.style.setProperty('--font-variation', font.variation);
	} else {
		root.style.removeProperty('--font-variation');
	}

	if (font.features) {
		root.style.setProperty('--font-features', font.features);
	} else {
		root.style.removeProperty('--font-features');
	}
}

export function applyFontWeight(weight: FontWeight) {
	const root = document.documentElement;
	root.dataset.fontWeight = String(weight);
	root.style.setProperty('--font-weight', String(weight));
}
