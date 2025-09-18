import { createServerCaller } from '$lib/trpc-caller';
import { IMAGE_DOMAIN, PHOTO_GALLERY_ID } from '$env/static/private';
import { requireAuth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	try {
		await requireAuth(event);
		const caller = await createServerCaller(event);
		const photoArrays = await caller.getAllItems({});
		
		return {
			photoArrays,
			imageDomain: IMAGE_DOMAIN,
			galleryId: PHOTO_GALLERY_ID
		};
	} catch (error) {
		// Redirect to login if not authenticated
		throw redirect(302, '/admin/login');
	}
};
