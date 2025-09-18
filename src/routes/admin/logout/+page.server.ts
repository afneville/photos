import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// Clear the auth token cookie
	cookies.delete('auth_token', { path: '/' });

	// Redirect to login
	throw redirect(302, '/admin/login');
};
