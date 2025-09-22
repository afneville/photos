import { createServerCaller } from '$lib/trpc-caller';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const caller = await createServerCaller(event);
	const photoArrays = await caller.getPublicItems({});
	return {
		photoArrays,
		imageDomain: env.IMAGE_DOMAIN,
		galleryId: env.PHOTO_GALLERY_ID
	};
};
