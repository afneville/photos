import { getContext, setContext } from 'svelte';
import type { PhotoArray } from '$lib/api-types';

interface PhotoContext {
	photoArrays: PhotoArray[];
	galleryId: string;
	imageDomain: string;
}

const PHOTO_CONTEXT_KEY = Symbol('photo-context');

export function setPhotoContext(photoArrays: PhotoArray[], galleryId: string, imageDomain: string) {
	return setContext<PhotoContext>(PHOTO_CONTEXT_KEY, {
		photoArrays,
		galleryId,
		imageDomain
	});
}

export function getPhotoContext(): PhotoContext {
	return getContext<PhotoContext>(PHOTO_CONTEXT_KEY);
}
