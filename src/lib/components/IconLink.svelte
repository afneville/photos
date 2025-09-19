<script lang="ts">
	import type { ComponentType } from 'svelte';

	let {
		href,
		icon,
		size = '24',
		className = ''
	}: {
		href: string;
		icon: ComponentType;
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
	<svelte:component this={icon} {size} />
</a>
