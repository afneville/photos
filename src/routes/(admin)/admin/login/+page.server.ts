import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';
import { AuthService } from '$lib/auth.service';

import {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
	type InitiateAuthCommandInput
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
	region: env.CLOUD_REGION
});

export const load: PageServerLoad = async (event) => {
	const authService = new AuthService();
	const token = authService.getTokenFromCookies(event);
	if (token) {
		const authenticated = await authService.isAuthenticated(token);
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
				ClientId: env.COGNITO_CLIENT_ID,
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

			cookies.set('auth_token', response.AuthenticationResult.AccessToken, {
				httpOnly: true,
				secure: env.ENVIRONMENT === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 24,
				path: '/'
			});

			return { success: true };
		} catch (error) {
			console.error('Login error:', error);
			return fail(401, { error: 'Invalid email or password' });
		}
	}
};
