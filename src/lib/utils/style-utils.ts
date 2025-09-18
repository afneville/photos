/**
 * Utility functions for common styling patterns
 */

/**
 * Creates consistent button hover handlers for semi-transparent buttons
 */
export function createButtonHoverHandlers(normalOpacity: number = 0.4, hoverOpacity: number = 0.6) {
	return {
		onmouseover: (e: MouseEvent) => {
			(e.currentTarget as HTMLElement).style.backgroundColor = `rgba(0, 0, 0, ${hoverOpacity})`;
		},
		onmouseout: (e: MouseEvent) => {
			(e.currentTarget as HTMLElement).style.backgroundColor = `rgba(0, 0, 0, ${normalOpacity})`;
		},
		onfocus: (e: FocusEvent) => {
			(e.currentTarget as HTMLElement).style.backgroundColor = `rgba(0, 0, 0, ${hoverOpacity})`;
		},
		onblur: (e: FocusEvent) => {
			(e.currentTarget as HTMLElement).style.backgroundColor = `rgba(0, 0, 0, ${normalOpacity})`;
		}
	};
}

/**
 * Common button base styles for navigation buttons
 */
export const navigationButtonClass =
	'absolute top-1/2 -translate-y-1/2 rounded-full p-3 text-white transition-all duration-200';

/**
 * Creates a semi-transparent background style
 */
export function createBackgroundStyle(opacity: number = 0.4): string {
	return `background-color: rgba(0, 0, 0, ${opacity});`;
}
