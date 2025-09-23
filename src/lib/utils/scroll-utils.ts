/**
 * Utility functions for managing scroll behavior when modals are open
 */

let scrollPosition = 0;
let isScrollLocked = false;

/**
 * Prevents background scrolling by fixing the body position
 * and hiding scrollbars
 */
export function lockScroll(): void {
	if (isScrollLocked) return;
	
	// Store current scroll position
	scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
	
	// Apply styles to prevent scrolling
	const body = document.body;
	body.style.position = 'fixed';
	body.style.top = `-${scrollPosition}px`;
	body.style.left = '0';
	body.style.right = '0';
	body.style.overflow = 'hidden';
	
	// Prevent scrollbar width changes
	body.style.paddingRight = getScrollbarWidth() + 'px';
	
	isScrollLocked = true;
}

/**
 * Restores normal scrolling and returns to the previous scroll position
 */
export function unlockScroll(): void {
	if (!isScrollLocked) return;
	
	const body = document.body;
	
	// Remove the fixed positioning styles
	body.style.position = '';
	body.style.top = '';
	body.style.left = '';
	body.style.right = '';
	body.style.overflow = '';
	body.style.paddingRight = '';
	
	// Restore scroll position
	window.scrollTo(0, scrollPosition);
	
	isScrollLocked = false;
}

/**
 * Gets the width of the scrollbar to prevent layout shift
 */
function getScrollbarWidth(): number {
	// Create a temporary div to measure scrollbar width
	const outer = document.createElement('div');
	outer.style.visibility = 'hidden';
	outer.style.overflow = 'scroll';
	document.body.appendChild(outer);
	
	const inner = document.createElement('div');
	outer.appendChild(inner);
	
	const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
	
	outer.parentNode?.removeChild(outer);
	
	return scrollbarWidth;
}

/**
 * Returns whether scroll is currently locked
 */
export function isScrollCurrentlyLocked(): boolean {
	return isScrollLocked;
}