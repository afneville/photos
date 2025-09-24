import { addVariablesForColors } from '@radix-ui/colors/css';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {}
		}
	},
	plugins: [
		addVariablesForColors({
			colors: ['gray', 'slate', 'neutral']
		})
	]
};
