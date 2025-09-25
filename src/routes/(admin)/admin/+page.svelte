<script lang="ts">
	import type { PhotoArray } from '$lib/api-types';
	import type { PageData } from './$types';
	import { setPhotoContext } from '$lib/contexts/photo-context';
	import { getImageUrl, ImageQuality } from '$lib/utils/image-utils';
	import CreatePhotoArrayModal from '$lib/components/CreatePhotoArrayModal.svelte';
	import { trpc } from '$lib/trpc-client';

	let { data }: { data: PageData } = $props();

	let isCreateModalOpen = $state(false);
	let draggedIndex = $state<number | null>(null);
	let isReordering = $state(false);
	let deletingArrayId = $state<string | null>(null);
	let dragOverIndex = $state<number | null>(null);

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

	async function handleMove(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex || isReordering) return;

		isReordering = true;

		try {
			const photoArrayId = data.photoArrays[fromIndex].photoArrayId;
			let beforeRangeKey: string | undefined;
			let afterRangeKey: string | undefined;

			console.log('Move operation:', {
				fromIndex,
				toIndex,
				fromArrayId: photoArrayId,
				totalArrays: data.photoArrays.length,
				currentOrder: data.photoArrays.map((arr, idx) => `${idx}: ${arr.photoArrayId}`)
			});

			// Determine the position to move to
			if (toIndex === 0) {
				// Moving to the beginning
				beforeRangeKey = data.photoArrays[0].photoArrayId;
				console.log('Moving to beginning:', { afterRangeKey });
			} else if (toIndex >= data.photoArrays.length - 1) {
				// Moving to the end
				afterRangeKey = data.photoArrays[data.photoArrays.length - 1].photoArrayId;
				console.log('Moving to end:', { afterRangeKey });
			} else {
				// Moving between two items
				if (fromIndex < toIndex) {
					// Moving down - place after the target position
					afterRangeKey = data.photoArrays[toIndex].photoArrayId;
					beforeRangeKey =
						toIndex + 1 < data.photoArrays.length
							? data.photoArrays[toIndex + 1].photoArrayId
							: undefined;
					console.log('Moving down:', {
						beforeRangeKey,
						afterRangeKey,
						targetPosition: toIndex,
						itemAtTarget: data.photoArrays[toIndex].photoArrayId,
						itemAfterTarget:
							toIndex + 1 < data.photoArrays.length
								? data.photoArrays[toIndex + 1].photoArrayId
								: 'none'
					});
				} else {
					// Moving up - place before the target position
					afterRangeKey = toIndex > 0 ? data.photoArrays[toIndex - 1].photoArrayId : undefined;
					beforeRangeKey = data.photoArrays[toIndex].photoArrayId;
					console.log('Moving up:', {
						beforeRangeKey,
						afterRangeKey,
						targetPosition: toIndex,
						itemBeforeTarget: toIndex > 0 ? data.photoArrays[toIndex - 1].photoArrayId : 'none',
						itemAtTarget: data.photoArrays[toIndex].photoArrayId
					});
				}
			}

			console.log('Final positioning:', { beforeRangeKey, afterRangeKey });

			await trpc.moveItem.mutate({
				photoArrayId,
				beforeRangeKey,
				afterRangeKey
			});

			// Refresh the page to show the new order
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		} catch (error) {
			console.error('Error moving photo array:', error);
			alert('Failed to move photo array. Please try again.');
		} finally {
			isReordering = false;
		}
	}

	function handleDragStart(event: DragEvent, index: number) {
		if (!event.dataTransfer) return;

		draggedIndex = index;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', index.toString());
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave(event: DragEvent, index: number) {
		// Only clear dragOverIndex if we're actually leaving this element
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;

		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			if (dragOverIndex === index) {
				dragOverIndex = null;
			}
		}
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();

		if (draggedIndex !== null) {
			handleMove(draggedIndex, dropIndex);
		}

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	async function handleDelete(photoArrayId: string) {
		deletingArrayId = photoArrayId;

		try {
			await trpc.deleteItem.mutate({
				photoArrayId
			});

			// Refresh the page to show the updated list
			if (typeof window !== 'undefined') {
				window.location.reload();
			}
		} catch (error) {
			console.error('Error deleting photo array:', error);
			alert('Failed to delete photo array. Please try again.');
		} finally {
			deletingArrayId = null;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Photo Array Administration</h1>
				<p class="mt-2 text-sm text-gray-600">Drag and drop photo arrays to reorder them</p>
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
					<!-- Drop indicator above current item -->
					{#if draggedIndex !== null && dragOverIndex === index && draggedIndex > index}
						<div
							class="mx-4 h-1 animate-pulse rounded-full bg-blue-500 transition-all duration-200"
						></div>
					{/if}

					<div
						class="rounded-lg border p-6 shadow-sm transition-all duration-200 {draggedIndex ===
						index
							? 'scale-95 border-gray-300 opacity-50'
							: dragOverIndex === index
								? 'border-blue-500 bg-blue-50 shadow-lg'
								: 'border-gray-200 bg-white hover:shadow-md'} {isReordering
							? 'cursor-wait'
							: 'cursor-move'}"
						draggable={!isReordering}
						ondragstart={(e) => handleDragStart(e, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={(e) => handleDragLeave(e, index)}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
						role="button"
						tabindex="0"
						aria-label="Drag to reorder photo array {index + 1}"
					>
						<!-- Array Header -->
						<div class="mb-4 flex items-start justify-between">
							<div class="flex items-center gap-3">
								<!-- Drag Handle -->
								<div
									class="flex flex-col gap-1 {draggedIndex === index
										? 'text-blue-500'
										: isReordering
											? 'text-gray-300 opacity-50'
											: 'text-gray-400 hover:text-gray-600'}"
									aria-hidden="true"
								>
									<div class="h-1 w-1 rounded-full bg-current"></div>
									<div class="h-1 w-1 rounded-full bg-current"></div>
									<div class="h-1 w-1 rounded-full bg-current"></div>
									<div class="h-1 w-1 rounded-full bg-current"></div>
									<div class="h-1 w-1 rounded-full bg-current"></div>
									<div class="h-1 w-1 rounded-full bg-current"></div>
								</div>
								<div>
									<h2 class="text-xl font-semibold text-gray-900">
										Array {index + 1}: {photoArray.photoArrayId}
									</h2>
									<p class="text-sm text-gray-500">
										{photoArray.photoUris?.length || 0} photos
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								{#if isReordering}
									<div class="flex items-center gap-2 text-sm text-blue-600">
										<svg
											class="h-4 w-4 animate-spin"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											></path>
										</svg>
										Reordering...
									</div>
								{/if}

								<button
									class="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => handleDelete(photoArray.photoArrayId)}
									disabled={isReordering || deletingArrayId === photoArray.photoArrayId}
									title="Delete photo array"
								>
									{#if deletingArrayId === photoArray.photoArrayId}
										<svg
											class="h-3 w-3 animate-spin"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											></path>
										</svg>
									{:else}
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											></path>
										</svg>
									{/if}
									{deletingArrayId === photoArray.photoArrayId ? 'Deleting...' : 'Delete'}
								</button>
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
												style="color: transparent;"
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

					<!-- Drop indicator below current item -->
					{#if draggedIndex !== null && dragOverIndex === index && draggedIndex < index}
						<div
							class="mx-4 h-1 animate-pulse rounded-full bg-blue-500 transition-all duration-200"
						></div>
					{/if}

					<!-- Drop indicator at the end if dragging to last position -->
					{#if draggedIndex !== null && dragOverIndex === index && index === data.photoArrays.length - 1}
						<div
							class="mx-4 h-1 animate-pulse rounded-full bg-blue-500 transition-all duration-200"
						></div>
					{/if}
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
