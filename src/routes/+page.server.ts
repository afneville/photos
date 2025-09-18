import { createServerCaller } from '$lib/trpc-caller';
import { IMAGE_DOMAIN, PHOTO_GALLERY_ID } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const caller = await createServerCaller(event);
	const photoArrays = await caller.getPublicItems({});
	return {
		photoArrays,
		imageDomain: IMAGE_DOMAIN,
		galleryId: PHOTO_GALLERY_ID
	};
};
