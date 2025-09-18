import { fail, redirect } from '@sveltejs/kit';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, AWS_REGION } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';
import { getTokenFromCookies, isAuthenticated } from '$lib/auth';

// AWS SDK for authentication
import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	type InitiateAuthCommandInput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
	region: AWS_REGION
});

export const load: PageServerLoad = async (event) => {
	// If already authenticated, redirect to admin
	const token = getTokenFromCookies(event);
	if (token) {
		const authenticated = await isAuthenticated(token);
		if (authenticated) {
			throw redirect(302, '/admin');
		}
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email') as string;
		const password = data.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		try {
			const authParams: InitiateAuthCommandInput = {
				AuthFlow: 'USER_PASSWORD_AUTH',
				ClientId: COGNITO_CLIENT_ID,
				AuthParameters: {
					USERNAME: email,
					PASSWORD: password
				}
			};

			const command = new InitiateAuthCommand(authParams);
			const response = await cognitoClient.send(command);

			if (!response.AuthenticationResult?.AccessToken) {
				return fail(401, { error: 'Authentication failed' });
			}

			// Set httpOnly cookie with the access token
			cookies.set('auth_token', response.AuthenticationResult.AccessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 24, // 24 hours
				path: '/'
			});

			// Return success instead of redirect for form enhancement
			return { success: true };
		} catch (error) {
			console.error('Login error:', error);
			return fail(401, { error: 'Invalid email or password' });
		}
	}
};