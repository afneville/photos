let scrollPosition = 0;
let isScrollLocked = false;

export function lockScroll(): void {
	if (isScrollLocked) return;

	scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

	const body = document.body;
	body.style.position = 'fixed';
	body.style.top = `-${scrollPosition}px`;
	body.style.left = '0';
	body.style.right = '0';
	body.style.overflow = 'hidden';

	body.style.paddingRight = getScrollbarWidth() + 'px';

	isScrollLocked = true;
}

export function unlockScroll(): void {
	if (!isScrollLocked) return;

	const body = document.body;

	body.style.position = '';
	body.style.top = '';
	body.style.left = '';
	body.style.right = '';
	body.style.overflow = '';
	body.style.paddingRight = '';

	window.scrollTo(0, scrollPosition);

	isScrollLocked = false;
}

function getScrollbarWidth(): number {
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

export function isScrollCurrentlyLocked(): boolean {
	return isScrollLocked;
}
