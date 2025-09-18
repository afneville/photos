import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JwtVerifier = CognitoJwtVerifier<any, any, any>;

export class AuthService {
	private readonly verifier: JwtVerifier;

	constructor(verifier?: JwtVerifier) {
		this.verifier =
			verifier ??
			CognitoJwtVerifier.create({
				userPoolId: COGNITO_USER_POOL_ID,
				tokenUse: 'access',
				clientId: COGNITO_CLIENT_ID
			});
	}

	async isAuthenticated(token: string): Promise<boolean> {
		try {
			await this.verifier.verify(token);
			return true;
		} catch (error) {
			return false;
		}
	}

	getTokenFromCookies(event: RequestEvent): string | null {
		return event.cookies.get('auth_token') || null;
	}

	async requireAuth(event: RequestEvent): Promise<void> {
		const token = this.getTokenFromCookies(event);

		if (!token) {
			throw new Error('No authentication token found');
		}

		const authenticated = await this.isAuthenticated(token);

		if (!authenticated) {
			throw new Error('Invalid authentication token');
		}
	}
}
