export interface SwipeHandlers {
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
}

export function createSwipeHandlers(handlers: SwipeHandlers) {
	let startX = 0;
	let startY = 0;
	let currentX = 0;
	let currentY = 0;
	let isTracking = false;

	const minSwipeDistance = 50;
	const maxVerticalDistance = 100;

	function handleTouchStart(event: TouchEvent) {
		if (event.touches.length !== 1) return;

		const touch = event.touches[0];
		startX = touch.clientX;
		startY = touch.clientY;
		currentX = startX;
		currentY = startY;
		isTracking = true;
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isTracking || event.touches.length !== 1) return;

		const touch = event.touches[0];
		currentX = touch.clientX;
		currentY = touch.clientY;
	}

	function handleTouchEnd() {
		if (!isTracking) return;

		const deltaX = currentX - startX;
		const deltaY = Math.abs(currentY - startY);
		const absDeltaX = Math.abs(deltaX);

		if (absDeltaX >= minSwipeDistance && deltaY <= maxVerticalDistance) {
			if (deltaX > 0 && handlers.onSwipeRight) {
				handlers.onSwipeRight();
			} else if (deltaX < 0 && handlers.onSwipeLeft) {
				handlers.onSwipeLeft();
			}
		}

		isTracking = false;
	}

	function handleTouchCancel() {
		isTracking = false;
	}

	return {
		ontouchstart: handleTouchStart,
		ontouchmove: handleTouchMove,
		ontouchend: handleTouchEnd,
		ontouchcancel: handleTouchCancel
	};
}
