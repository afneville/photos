import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

// Create the verifier outside of request handling to reuse
const verifier = CognitoJwtVerifier.create({
	userPoolId: COGNITO_USER_POOL_ID,
	tokenUse: 'access',
	clientId: COGNITO_CLIENT_ID
});

export async function isAuthenticated(token: string): Promise<boolean> {
	try {
		await verifier.verify(token);
		return true;
	} catch (error) {
		console.error('JWT verification failed:', error);
		return false;
	}
}

export function getTokenFromCookies(event: RequestEvent): string | null {
	return event.cookies.get('auth_token') || null;
}

export async function requireAuth(event: RequestEvent): Promise<void> {
	const token = getTokenFromCookies(event);

	if (!token) {
		throw new Error('No authentication token found');
	}

	const authenticated = await isAuthenticated(token);

	if (!authenticated) {
		throw new Error('Invalid authentication token');
	}
}
