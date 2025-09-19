<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		icon,
		size = '24',
		className = ''
	}: {
		href: string;
		icon: Snippet<[{ size: string }]>;
		size?: string;
		className?: string;
	} = $props();
</script>

<a
	{href}
	target="_blank"
	rel="noopener noreferrer"
	class="text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)] {className}"
>
	{@render icon({size})}
</a>
