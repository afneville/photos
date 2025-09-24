import { addVariablesForColors } from '@radix-ui/colors/css';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {},
			fontFamily: {
				sans: ['Iosevka Aile Web', 'system-ui', '-apple-system', 'sans-serif'],
				iosevka: ['Iosevka Aile Web', 'system-ui', '-apple-system', 'sans-serif']
			}
		}
	},
	plugins: [
		addVariablesForColors({
			colors: ['gray', 'slate', 'neutral']
		})
	]
};
