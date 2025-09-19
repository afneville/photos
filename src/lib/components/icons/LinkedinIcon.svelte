<script lang="ts">
	export let size: string = '24';
	export let color: string = 'currentColor';
	export let className: string = '';
	export let strokeWidth: string = '2';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	{...$$restProps}
>
	<path d="M17 8a6 6 0 0 1 6 6v7h-4.5v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4.5v-7a6 6 0 0 1 6-6z" />
	<rect x="1.5" y="9" width="5" height="12" />
	<circle cx="4" cy="4" r="2.3" />
</svg>
