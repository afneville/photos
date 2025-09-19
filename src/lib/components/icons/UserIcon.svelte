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
	<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
	<circle cx="12" cy="6" r="5" />
</svg>
