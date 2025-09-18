<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import { setPhotoContext } from '$lib/contexts/photo-context';
	import { getImageUrl, ImageQuality } from '$lib/utils/image-utils';
	import CreatePhotoArrayModal from '$lib/components/CreatePhotoArrayModal.svelte';

	let { data }: { data: PageData } = $props();

	let isCreateModalOpen = $state(false);

	setPhotoContext(data.photoArrays, data.galleryId, data.imageDomain);

	function openCreateModal() {
		isCreateModalOpen = true;
	}

	function closeCreateModal() {
		isCreateModalOpen = false;
	}

	function handleCreateSuccess() {
		// Refresh the page to show the new array
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}

	function getThumbnailUrl(photoArray: PhotoArray, photoUri: string) {
		return getImageUrl(
			data.imageDomain,
			data.galleryId,
			photoArray.photoArrayId,
			photoUri,
			ImageQuality.THUMBNAIL
		);
	}

	function formatDate(timestamp: string) {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Photo Array Administration</h1>
			</div>
			<div class="flex items-center gap-4">
				<button
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
					onclick={openCreateModal}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Create New Array
				</button>
				<a
					href="/admin/logout"
					class="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Logout
				</a>
			</div>
		</div>

		{#if data.photoArrays.length}
			<div class="space-y-8">
				{#each data.photoArrays as photoArray, index (photoArray.photoArrayId)}
					<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
						<!-- Array Header -->
						<div class="mb-4 flex items-start justify-between">
							<div>
								<h2 class="text-xl font-semibold text-gray-900">
									Array {index + 1}: {photoArray.photoArrayId}
								</h2>
								<p class="text-sm text-gray-500">
									{photoArray.photoUris?.length || 0} photos
								</p>
							</div>
						</div>

						<!-- Metadata -->
						<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<h3 class="text-sm font-medium text-gray-500">Location</h3>
								<p class="mt-1 text-sm text-gray-900">{photoArray.location || 'Unknown'}</p>
							</div>
							<div>
								<h3 class="text-sm font-medium text-gray-500">Date</h3>
								<p class="mt-1 text-sm text-gray-900">{formatDate(photoArray.timestamp)}</p>
							</div>
							<div>
								<h3 class="text-sm font-medium text-gray-500">Array ID</h3>
								<p class="mt-1 font-mono text-sm text-gray-900">{photoArray.photoArrayId}</p>
							</div>
							<div>
								<h3 class="text-sm font-medium text-gray-500">Timestamp</h3>
								<p class="mt-1 font-mono text-sm text-gray-900">{photoArray.timestamp}</p>
							</div>
							<div>
								<h3 class="text-sm font-medium text-gray-500">Photo Count</h3>
								<p class="mt-1 text-sm text-gray-900">{photoArray.photoUris?.length || 0}</p>
							</div>
						</div>

						<!-- Thumbnails -->
						{#if photoArray.photoUris && photoArray.photoUris.length > 0}
							<div>
								<h3 class="mb-3 text-sm font-medium text-gray-700">Thumbnails</h3>
								<div class="flex gap-2 overflow-x-auto pb-2">
									{#each photoArray.photoUris as photoUri, photoIndex (photoUri)}
										<div class="flex-shrink-0">
											<img
												src={getThumbnailUrl(photoArray, photoUri)}
												alt="Photo {photoIndex + 1} from {photoArray.photoArrayId}"
												class="h-20 w-20 rounded border border-gray-200 object-cover"
											/>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="py-4 text-center">
								<p class="text-sm text-gray-500">No photos in this array</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-12 text-center">
				<p class="text-xl text-gray-600">No photo arrays found.</p>
			</div>
		{/if}
	</div>
</div>

{#if isCreateModalOpen}
	<CreatePhotoArrayModal onClose={closeCreateModal} onSuccess={handleCreateSuccess} />
{/if}
