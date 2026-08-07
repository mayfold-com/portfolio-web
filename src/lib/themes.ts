export type ThemeId = 'ink' | 'paper' | 'amber' | 'blue' | 'green' | 'purple';

export type Theme = {
	id: ThemeId;
	label: string;
	/** Swatch color shown in the radial picker */
	swatch: string;
	bg: string;
	text: string;
	muted: string;
	/** Accent used on the floating picker chrome */
	accent: string;
};

export const themes: Theme[] = [
	{
		id: 'ink',
		label: 'Ink',
		swatch: '#141414',
		bg: '#141414',
		text: '#EEE8DE',
		muted: '#9c968c',
		accent: '#EEE8DE'
	},
	{
		id: 'paper',
		label: 'Paper',
		swatch: '#f3efe6',
		bg: '#ffffff',
		text: '#000000',
		muted: '#555555',
		accent: '#1a73e8'
	},
	{
		id: 'amber',
		label: 'Amber',
		swatch: '#f2b83c',
		bg: '#f2b83c',
		text: '#000000',
		muted: '#4a3a12',
		accent: '#1a73e8'
	},
	{
		id: 'blue',
		label: 'Blue',
		swatch: '#1a73e8',
		bg: '#0b4db8',
		text: '#f4f7ff',
		muted: '#c5d6f5',
		accent: '#1a73e8'
	},
	{
		id: 'green',
		label: 'Green',
		swatch: '#3f7d4e',
		bg: '#2f6b3a',
		text: '#f3efe6',
		muted: '#d0dece',
		accent: '#3f7d4e'
	},
	{
		id: 'purple',
		label: 'Purple',
		swatch: '#5b2c6f',
		bg: '#4a1f5c',
		text: '#f8f0ff',
		muted: '#d8c3e4',
		accent: '#5b2c6f'
	}
];

export const defaultThemeId: ThemeId = 'ink';
export const themeStorageKey = 'naim-theme';

export function isThemeId(value: string | null | undefined): value is ThemeId {
	return themes.some((theme) => theme.id === value);
}

export function getTheme(id: ThemeId): Theme {
	return themes.find((theme) => theme.id === id) ?? themes[0];
}

function setThemeColorMeta(bg: string) {
	let meta = document.querySelector('meta[name="theme-color"]');
	if (!meta) {
		meta = document.createElement('meta');
		meta.setAttribute('name', 'theme-color');
		document.head.appendChild(meta);
	}
	meta.setAttribute('content', bg);
}

export function applyTheme(id: ThemeId) {
	const theme = getTheme(id);
	const root = document.documentElement;
	const light = theme.bg === '#ffffff' || theme.bg === '#f2b83c';

	root.dataset.theme = theme.id;
	root.style.setProperty('--color-bg', theme.bg);
	root.style.setProperty('--color-text', theme.text);
	root.style.setProperty('--color-muted', theme.muted);
	root.style.setProperty('--color-accent', theme.accent);
	root.style.setProperty('--color-swatch', theme.swatch);
	root.style.backgroundColor = theme.bg;
	root.style.colorScheme = light ? 'light' : 'dark';
	setThemeColorMeta(theme.bg);
}
