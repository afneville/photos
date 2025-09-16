
import { caller } from '$lib/trpc-caller';
import { IMAGE_DOMAIN, PHOTO_GALLERY_ID } from '$env/static/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const photoArrays = await caller.getAllItems({});
  return {
    photoArrays,
    imageDomain: IMAGE_DOMAIN,
    galleryId: PHOTO_GALLERY_ID
  };
};
