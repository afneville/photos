<script lang="ts">
	import { SunIcon, MoonIcon, SettingsIcon } from './icons';

	type Theme = 'auto' | 'light' | 'dark';

	let theme = $state<Theme>('auto');
	let systemTheme = $state<'light' | 'dark'>('light');

	function updateTheme() {
		const isDark = theme === 'dark' || (theme === 'auto' && systemTheme === 'dark');

		document.documentElement.classList.toggle('dark', isDark);

		setTimeout(() => {
			document.documentElement.style.transition = '';
		}, 300);
	}

	function setTheme(newTheme: Theme) {
		theme = newTheme;
		if (newTheme === 'auto') {
			localStorage.removeItem('theme');
		} else {
			localStorage.setItem('theme', newTheme);
		}
		updateTheme();
	}

	$effect(() => {
		const stored = localStorage.getItem('theme') as Theme | null;
		theme = stored || 'auto';

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		systemTheme = mediaQuery.matches ? 'dark' : 'light';

		const handleChange = (e: MediaQueryListEvent) => {
			systemTheme = e.matches ? 'dark' : 'light';
			updateTheme();
		};

		mediaQuery.addEventListener('change', handleChange);
		updateTheme();

		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	$effect(() => {
		updateTheme();
	});
</script>

<div
	class="flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] p-1 transition-colors duration-200"
>
	<button
		class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out {theme ===
		'auto'
			? 'scale-105 bg-[var(--bg-primary)] text-[var(--text-primary)]'
			: 'text-[var(--text-muted)] hover:scale-105 hover:bg-[var(--bg-hover)]'}"
		onclick={() => setTheme('auto')}
		aria-label="System theme"
		title="System"
	>
		<SettingsIcon size="16" />
	</button>
	<button
		class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out {theme ===
		'light'
			? 'scale-105 bg-[var(--bg-primary)] text-[var(--text-primary)]'
			: 'text-[var(--text-muted)] hover:scale-105 hover:bg-[var(--bg-hover)]'}"
		onclick={() => setTheme('light')}
		aria-label="Light theme"
		title="Light"
	>
		<SunIcon size="16" />
	</button>
	<button
		class="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out {theme ===
		'dark'
			? 'scale-105 bg-[var(--bg-primary)] text-[var(--text-primary)]'
			: 'text-[var(--text-muted)] hover:scale-105 hover:bg-[var(--bg-hover)]'}"
		onclick={() => setTheme('dark')}
		aria-label="Dark theme"
		title="Dark"
	>
		<MoonIcon size="16" />
	</button>
</div>
