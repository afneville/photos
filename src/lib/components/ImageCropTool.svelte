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

	let imageDimensions = $state({ width: 0, height: 0 });

	let containerRef: HTMLDivElement;
	let imageRef: HTMLImageElement;
	let isDragging = $state(false);
	let isResizing = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let imageLoaded = $state(false);

	let containerWidth = $state(0);
	let containerHeight = $state(0);

	let cropX = $state(0);
	let cropY = $state(0);
	let cropSize = $state(100);

	function handleImageLoad() {
		if (!imageRef || !containerRef) return;

		const rect = containerRef.getBoundingClientRect();
		containerWidth = rect.width;
		containerHeight = rect.height;

		imageDimensions.width = imageRef.naturalWidth;
		imageDimensions.height = imageRef.naturalHeight;

		imageLoaded = true;

		updateCropFromCoords();
	}

	function updateCropFromCoords() {
		if (!containerWidth || !containerHeight) return;

		if (cropCoords.x === 25 && cropCoords.y === 25 && cropCoords.size === 50) {
			const initialSize = Math.min(containerWidth, containerHeight) * 0.3;
			cropSize = initialSize;
			cropX = (containerWidth - cropSize) / 2;
			cropY = (containerHeight - cropSize) / 2;
		} else {
			cropX = (cropCoords.x / 100) * containerWidth;
			cropY = (cropCoords.y / 100) * containerHeight;
			cropSize = (cropCoords.size / 100) * Math.min(containerWidth, containerHeight);
		}
	}

	$effect(() => {
		if (imageUrl) {
			imageLoaded = false;
		}
	});

	$effect(() => {
		if (imageLoaded && cropCoords) {
			updateCropFromCoords();
		}
	});

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

	export function getPixelCoordinates() {
		if (!imageDimensions.width || !imageDimensions.height || !containerWidth || !containerHeight) {
			return null;
		}

		const imageAspect = imageDimensions.width / imageDimensions.height;
		const containerAspect = containerWidth / containerHeight;

		let displayedWidth: number;
		let displayedHeight: number;
		let offsetX: number = 0;
		let offsetY: number = 0;

		if (imageAspect > containerAspect) {
			displayedWidth = containerWidth;
			displayedHeight = containerWidth / imageAspect;
			offsetY = (containerHeight - displayedHeight) / 2;
		} else {
			displayedHeight = containerHeight;
			displayedWidth = containerHeight * imageAspect;
			offsetX = (containerWidth - displayedWidth) / 2;
		}

		const scale = imageDimensions.width / displayedWidth;

		const adjustedCropX = cropX - offsetX;
		const adjustedCropY = cropY - offsetY;

		const clampedX = Math.max(0, Math.min(displayedWidth - cropSize, adjustedCropX));
		const clampedY = Math.max(0, Math.min(displayedHeight - cropSize, adjustedCropY));
		const clampedSize = Math.min(cropSize, displayedWidth, displayedHeight);

		const pixelX = Math.round(clampedX * scale);
		const pixelY = Math.round(clampedY * scale);
		const pixelSize = Math.round(clampedSize * scale);

		const finalX = Math.max(0, Math.min(imageDimensions.width - pixelSize, pixelX));
		const finalY = Math.max(0, Math.min(imageDimensions.height - pixelSize, pixelY));
		const finalSize = Math.min(
			pixelSize,
			imageDimensions.width - finalX,
			imageDimensions.height - finalY
		);

		return {
			x: finalX,
			y: finalY,
			w: finalSize,
			h: finalSize
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
			cropX = Math.max(0, Math.min(containerWidth - cropSize, cropX + deltaX));
			cropY = Math.max(0, Math.min(containerHeight - cropSize, cropY + deltaY));
		} else if (isResizing) {
			const sizeDelta = Math.max(deltaX, deltaY);
			const newSize = Math.max(
				20,
				Math.min(Math.min(containerWidth, containerHeight), cropSize + sizeDelta)
			);

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
	<img
		bind:this={imageRef}
		src={imageUrl}
		alt="Crop preview"
		class="block max-h-96 max-w-full rounded border border-gray-300 object-contain"
		onload={handleImageLoad}
	/>

	{#if imageLoaded}
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute inset-x-0 top-0"
				style="height: {cropY}px; background-color: rgba(75, 85, 99, 0.9);"
			></div>
			<div
				class="absolute inset-x-0"
				style="top: {cropY + cropSize}px; height: {containerHeight -
					cropY -
					cropSize}px; background-color: rgba(75, 85, 99, 0.9);"
			></div>
			<div
				class="absolute"
				style="left: 0; top: {cropY}px; width: {cropX}px; height: {cropSize}px; background-color: rgba(75, 85, 99, 0.9);"
			></div>
			<div
				class="absolute"
				style="left: {cropX + cropSize}px; top: {cropY}px; width: {containerWidth -
					cropX -
					cropSize}px; height: {cropSize}px; background-color: rgba(75, 85, 99, 0.9);"
			></div>
		</div>

		<div
			class="absolute cursor-move border-2 border-blue-500 bg-transparent"
			style="left: {cropX}px; top: {cropY}px; width: {cropSize}px; height: {cropSize}px;"
			onmousedown={(e) => handleMouseDown(e, 'drag')}
			role="button"
			tabindex="0"
		>
			<div class="pointer-events-none absolute inset-0">
				<div class="absolute top-0 bottom-0 left-1/3 w-px bg-blue-300 opacity-70"></div>
				<div class="absolute top-0 bottom-0 left-2/3 w-px bg-blue-300 opacity-70"></div>
				<div class="absolute top-1/3 right-0 left-0 h-px bg-blue-300 opacity-70"></div>
				<div class="absolute top-2/3 right-0 left-0 h-px bg-blue-300 opacity-70"></div>
			</div>

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
	:global(body.no-select) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}
</style>
