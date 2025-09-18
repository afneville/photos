<script lang="ts">
	let {
		imageUrl,
		cropCoords = $bindable(),
		onCropChange
	}: {
		imageUrl: string;
		cropCoords: { x: number; y: number; size: number };
		onCropChange?: (coords: { x: number; y: number; size: number }) => void;
	} = $props();

	// Add image dimensions to the bindable crop coordinates
	let imageDimensions = $state({ width: 0, height: 0 });

	let containerRef: HTMLDivElement;
	let imageRef: HTMLImageElement;
	let isDragging = $state(false);
	let isResizing = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let imageLoaded = $state(false);

	// Container and image dimensions
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	// Crop coordinates as pixels within the container
	let cropX = $state(0);
	let cropY = $state(0);
	let cropSize = $state(100);

	function handleImageLoad() {
		if (!imageRef || !containerRef) return;

		const rect = containerRef.getBoundingClientRect();
		containerWidth = rect.width;
		containerHeight = rect.height;

		// Store actual image dimensions
		imageDimensions.width = imageRef.naturalWidth;
		imageDimensions.height = imageRef.naturalHeight;

		imageLoaded = true;

		// Log actual image dimensions for debugging
		console.log('Image natural dimensions:', imageDimensions.width, 'x', imageDimensions.height);
		console.log('Container dimensions:', containerWidth, 'x', containerHeight);

		updateCropFromCoords();
	}

	function updateCropFromCoords() {
		if (!containerWidth || !containerHeight) return;

		// Initialize crop to center if not set
		if (cropCoords.x === 25 && cropCoords.y === 25 && cropCoords.size === 50) {
			const initialSize = Math.min(containerWidth, containerHeight) * 0.3;
			cropSize = initialSize;
			cropX = (containerWidth - cropSize) / 2;
			cropY = (containerHeight - cropSize) / 2;
		} else {
			// Convert percentage coordinates to pixels
			cropX = (cropCoords.x / 100) * containerWidth;
			cropY = (cropCoords.y / 100) * containerHeight;
			cropSize = (cropCoords.size / 100) * Math.min(containerWidth, containerHeight);
		}
	}

	// React to changes in imageUrl (when switching between images)
	$effect(() => {
		// Reset loaded state when image URL changes
		if (imageUrl) {
			imageLoaded = false;
		}
	});

	// React to changes in cropCoords prop (when switching between images)
	$effect(() => {
		if (imageLoaded && cropCoords) {
			updateCropFromCoords();
		}
	});

	// Sync changes back to parent as percentages
	$effect(() => {
		if (containerWidth && containerHeight && imageLoaded) {
			const newCoords = {
				x: (cropX / containerWidth) * 100,
				y: (cropY / containerHeight) * 100,
				size: (cropSize / Math.min(containerWidth, containerHeight)) * 100
			};
			cropCoords = newCoords;
			onCropChange?.(newCoords);
		}
	});

	// Function to get actual pixel coordinates
	export function getPixelCoordinates() {
		if (!imageDimensions.width || !imageDimensions.height || !containerWidth || !containerHeight) {
			return null;
		}

		// Calculate scale factors between displayed and natural image
		const scaleX = imageDimensions.width / containerWidth;
		const scaleY = imageDimensions.height / containerHeight;

		// Convert crop coordinates to actual pixels
		const pixelX = Math.round(cropX * scaleX);
		const pixelY = Math.round(cropY * scaleY);

		// Since the crop is always square, use the average scale to ensure w === h
		const avgScale = (scaleX + scaleY) / 2;
		const pixelSize = Math.round(cropSize * avgScale);

		return {
			x: pixelX,
			y: pixelY,
			w: pixelSize,
			h: pixelSize
		};
	}

	function handleMouseDown(event: MouseEvent, action: 'drag' | 'resize') {
		event.preventDefault();
		event.stopPropagation();

		if (action === 'drag') {
			isDragging = true;
		} else {
			isResizing = true;
		}
		dragStart = { x: event.clientX, y: event.clientY };

		document.body.classList.add('no-select');
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging && !isResizing) return;

		const deltaX = event.clientX - dragStart.x;
		const deltaY = event.clientY - dragStart.y;

		if (isDragging) {
			// Update position with bounds checking
			cropX = Math.max(0, Math.min(containerWidth - cropSize, cropX + deltaX));
			cropY = Math.max(0, Math.min(containerHeight - cropSize, cropY + deltaY));
		} else if (isResizing) {
			// Use the larger delta to maintain square aspect ratio
			const sizeDelta = Math.max(deltaX, deltaY);
			const newSize = Math.max(
				20,
				Math.min(Math.min(containerWidth, containerHeight), cropSize + sizeDelta)
			);

			// Ensure the crop stays within bounds
			cropSize = newSize;
			cropX = Math.max(0, Math.min(containerWidth - cropSize, cropX));
			cropY = Math.max(0, Math.min(containerHeight - cropSize, cropY));
		}

		dragStart = { x: event.clientX, y: event.clientY };
	}

	function handleMouseUp() {
		isDragging = false;
		isResizing = false;
		document.body.classList.remove('no-select');
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}
</script>

<div class="relative inline-block" bind:this={containerRef}>
	<!-- The image displayed in full -->
	<img
		bind:this={imageRef}
		src={imageUrl}
		alt="Crop preview"
		class="block max-h-96 max-w-full rounded border border-gray-300 object-contain"
		onload={handleImageLoad}
	/>

	{#if imageLoaded}
		<!-- Semi-transparent overlay for non-cropped areas -->
		<div class="pointer-events-none absolute inset-0">
			<!-- Top -->
			<div
				class="absolute inset-x-0 top-0"
				style="height: {cropY}px; background-color: rgba(75, 85, 99, 0.6);"
			></div>
			<!-- Bottom -->
			<div
				class="absolute inset-x-0"
				style="top: {cropY + cropSize}px; height: {containerHeight -
					cropY -
					cropSize}px; background-color: rgba(75, 85, 99, 0.6);"
			></div>
			<!-- Left -->
			<div
				class="absolute"
				style="left: 0; top: {cropY}px; width: {cropX}px; height: {cropSize}px; background-color: rgba(75, 85, 99, 0.6);"
			></div>
			<!-- Right -->
			<div
				class="absolute"
				style="left: {cropX + cropSize}px; top: {cropY}px; width: {containerWidth -
					cropX -
					cropSize}px; height: {cropSize}px; background-color: rgba(75, 85, 99, 0.6);"
			></div>
		</div>

		<!-- Square crop control -->
		<div
			class="absolute cursor-move border-2 border-blue-500 bg-transparent"
			style="left: {cropX}px; top: {cropY}px; width: {cropSize}px; height: {cropSize}px;"
			onmousedown={(e) => handleMouseDown(e, 'drag')}
			role="button"
			tabindex="0"
		>
			<!-- Grid lines for rule of thirds -->
			<div class="pointer-events-none absolute inset-0">
				<!-- Vertical lines -->
				<div class="absolute top-0 bottom-0 left-1/3 w-px bg-blue-300 opacity-70"></div>
				<div class="absolute top-0 bottom-0 left-2/3 w-px bg-blue-300 opacity-70"></div>
				<!-- Horizontal lines -->
				<div class="absolute top-1/3 right-0 left-0 h-px bg-blue-300 opacity-70"></div>
				<div class="absolute top-2/3 right-0 left-0 h-px bg-blue-300 opacity-70"></div>
			</div>

			<!-- Resize handle -->
			<div
				class="absolute -right-1 -bottom-1 h-4 w-4 cursor-se-resize rounded-sm border border-white bg-blue-500"
				onmousedown={(e) => {
					e.stopPropagation();
					handleMouseDown(e, 'resize');
				}}
				role="button"
				tabindex="0"
			></div>
		</div>
	{/if}
</div>

<style>
	/* Prevent text selection while dragging */
	:global(body.no-select) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}
</style>
