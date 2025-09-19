<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { ScaleIcon, GitBranchIcon } from '$lib/components/icons';
	import { BUILD_INFO } from '$lib/utils/build-info';

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
</svelte:head>

<div class="app-container">
	<header>
		<Heading />
	</header>

	<main>
		{@render children?.()}
	</main>

	<footer class="flex items-center justify-center gap-6 py-8">
		<div class="flex items-center gap-4">
			<a
				href="https://creativecommons.org/licenses/by-sa/4.0/"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-2 leading-none text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
			>
				<ScaleIcon size="20" />
				CC BY-SA 4.0
			</a>
			{#if BUILD_INFO.commitHash}
				<a
					href="https://github.com/{BUILD_INFO.githubRepo}/commit/{BUILD_INFO.commitHash}"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 leading-none text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
					title="View commit on GitHub"
				>
					<GitBranchIcon size="20" />
					{BUILD_INFO.shortCommitHash}
				</a>
			{/if}
		</div>
		<ThemeToggle />
	</footer>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--bg-primary);
	}

	header {
		width: 100vw;
		max-width: calc(5 * 300px + 2vw + 4rem);
		margin-inline: auto;
		padding-inline: 1vw;
		padding-top: 2rem;
		background-color: var(--bg-primary);
	}

	main {
		flex: 1;
		width: 100vw;
		max-width: calc(5 * 300px + 2vw + 4rem);
		margin-inline: auto;
		padding-inline: 1vw;
		padding-bottom: 2rem;
		background-color: var(--bg-primary);
	}

	footer {
		margin-top: auto;
		/* Footer styles can be added here */
	}
</style>
