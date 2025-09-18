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
	<circle cx="12" cy="12" r="4" />
	<path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
</svg>