<script lang="ts">
	import '../../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
		rel="stylesheet"
	/>
	<title>Photo Gallery Admin</title>
</svelte:head>

<div class="admin-container">
	<main>
		{@render children?.()}
	</main>
</div>

<style>
	.admin-container {
		min-height: 100vh;
		background-color: var(--bg-primary);
		font-family: 'Roboto', sans-serif;
	}

	main {
		width: 100%;
		min-height: 100vh;
	}
</style>