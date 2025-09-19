import { addVariablesForColors } from '@radix-ui/colors/css';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// Radix colors will be added via CSS variables
			}
		}
	},
	plugins: [
		addVariablesForColors({
			colors: ['gray', 'slate', 'neutral']
		})
	]
};
