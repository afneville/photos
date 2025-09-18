<script lang="ts">
	import IconLink from './IconLink.svelte';
	import { GithubIcon, LinkedinIcon, AtSignIcon, MessageCircleIcon, UserIcon } from './icons';
</script>

<div class="mb-8 flex items-center justify-center gap-6">
	<img
		src="/assets/panda.jpg"
		alt="Profile"
		class="h-24 w-24 rounded-full border border-gray-300 object-cover"
	/>
	<div class="flex flex-col">
		<h1 class="mb-2 text-4xl font-bold text-gray-800">Alexander Neville</h1>
		<div class="flex gap-5 ml-1">
			<IconLink href="https://afneville.com" icon={UserIcon} />
			<IconLink href="mailto:contact@afneville.com" icon={AtSignIcon} />
			<IconLink
				href="https://signal.me/#eu/vaojnhDojUTxZPfY7OcrxXKde-0_TQoq8Ho1VGVasQ4Nx5l-27tJqbDod4z3zMfN"
				icon={MessageCircleIcon}
			/>
			<IconLink href="https://github.com/afneville" icon={GithubIcon} />
			<IconLink href="https://linkedin.com/in/afneville" icon={LinkedinIcon} />
		</div>
	</div>
</div>
