import { createServerCaller } from '$lib/trpc-caller';
import { env } from '$env/dynamic/private';
import { AuthService } from '$lib/auth.service';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	try {
		const authService = new AuthService();
		await authService.requireAuth(event);
		const caller = await createServerCaller(event);
		const photoArrays = await caller.getAllItems({});

		return {
			photoArrays,
			imageDomain: env.IMAGE_DOMAIN,
			galleryId: env.PHOTO_GALLERY_ID
		};
	} catch {
		throw redirect(302, '/admin/login');
	}
};
