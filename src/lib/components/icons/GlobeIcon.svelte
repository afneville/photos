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
	<circle cx="12" cy="12" r="10" />
	<line x1="2" y1="12" x2="22" y2="12" />
	<path
		d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
	/>
</svg>
