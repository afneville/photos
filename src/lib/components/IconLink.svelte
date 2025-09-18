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
	class="text-gray-500 hover:text-gray-700 transition-colors duration-200 {className}"
>
	<svelte:component this={icon} {size} />
</a>