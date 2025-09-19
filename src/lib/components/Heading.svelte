<script lang="ts">
	import IconLink from './IconLink.svelte';
	import { GithubIcon, LinkedinIcon, AtSignIcon, MessageCircleIcon, UserIcon } from './icons';
</script>

<div class="heading-wrapper mb-8 flex items-center justify-center gap-5">
	<img
		src="/assets/panda.jpg"
		alt="Profile"
		class="profile-image h-20 w-20 rounded-full border border-[var(--border-normal)] object-cover"
	/>
	<div class="details-wrapper flex flex-col">
		<h1 class="heading-title mb-2 text-4xl font-bold text-[var(--text-primary)]">
			Alexander Neville
		</h1>
		<div class="icon-container ml-1 flex gap-5">
			<IconLink href="https://afneville.com" icon={UserIcon} size="24" />
			<IconLink href="mailto:contact@afneville.com" icon={AtSignIcon} size="24" />
			<IconLink
				href="https://signal.me/#eu/vaojnhDojUTxZPfY7OcrxXKde-0_TQoq8Ho1VGVasQ4Nx5l-27tJqbDod4z3zMfN"
				icon={MessageCircleIcon}
				size="24"
			/>
			<IconLink href="https://github.com/afneville" icon={GithubIcon} size="24" />
			<IconLink href="https://linkedin.com/in/afneville" icon={LinkedinIcon} size="24" />
		</div>
	</div>
</div>

<style>
	.details-wrapper {
		justify-content: center;
	}

	@media (max-width: 600px) {
		.heading-wrapper {
			gap: 1.25rem;
		}

		.heading-title {
			font-size: 1.875rem;
		}

		.profile-image {
			width: 4rem;
			height: 4rem;
		}

		.icon-container {
			gap: 1rem;
		}

		.icon-container :global(svg) {
			width: 20px;
			height: 20px;
		}
	}

	@media (max-width: 480px) {
		.heading-wrapper {
			gap: 1rem;
		}

		.heading-title {
			font-size: 1.5rem;
		}

		.profile-image {
			width: 3.5rem;
			height: 3.5rem;
		}

		.icon-container {
			gap: 0.75rem;
		}

		.icon-container :global(svg) {
			width: 18px;
			height: 18px;
		}
	}
</style>
