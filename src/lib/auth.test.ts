import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JwtVerifier = any;

vi.mock('aws-jwt-verify', () => ({
	CognitoJwtVerifier: {
		create: vi.fn(() => ({
			verify: vi.fn()
		}))
	}
}));

vi.mock('$env/static/private', () => ({
	COGNITO_USER_POOL_ID: 'us-west-2_XXXXXXXXX',
	COGNITO_CLIENT_ID: 'test-client-id'
}));

import { AuthService } from './auth.service.js';

describe('AuthService', () => {
	const createMockRequestEvent = (authToken?: string): RequestEvent =>
		({
			cookies: {
				get: vi
					.fn()
					.mockImplementation((name: string) => (name === 'auth_token' ? authToken : null))
			}
		}) as unknown as RequestEvent;

	describe('with dependency injection', () => {
		let mockVerifier: JwtVerifier;
		let authService: AuthService;

		beforeEach(() => {
			mockVerifier = {
				verify: vi.fn()
			};

			authService = new AuthService(mockVerifier);
			vi.clearAllMocks();
		});

		describe('getTokenFromCookies', () => {
			it('should return token from auth_token cookie', () => {
				const event = createMockRequestEvent('test-token-123');

				const result = authService.getTokenFromCookies(event);

				expect(result).toBe('test-token-123');
				expect(event.cookies.get).toHaveBeenCalledWith('auth_token');
			});

			it('should return null when no auth_token cookie', () => {
				const event = createMockRequestEvent();

				const result = authService.getTokenFromCookies(event);

				expect(result).toBeNull();
				expect(event.cookies.get).toHaveBeenCalledWith('auth_token');
			});
		});

		describe('isAuthenticated', () => {
			it('should return true for valid JWT token', async () => {
				const mockVerify = vi.mocked(mockVerifier.verify);
				mockVerify.mockResolvedValue({});

				const result = await authService.isAuthenticated('valid.jwt.token');

				expect(result).toBe(true);
				expect(mockVerify).toHaveBeenCalledWith('valid.jwt.token');
			});

			it('should return false for invalid JWT token', async () => {
				const mockVerify = vi.mocked(mockVerifier.verify);
				mockVerify.mockRejectedValue(new Error('Invalid token'));

				const result = await authService.isAuthenticated('invalid.token');

				expect(result).toBe(false);
				expect(mockVerify).toHaveBeenCalledWith('invalid.token');
			});
		});

		describe('requireAuth', () => {
			it('should pass for valid authentication', async () => {
				const mockVerify = vi.mocked(mockVerifier.verify);
				mockVerify.mockResolvedValue({});
				const event = createMockRequestEvent('valid.jwt.token');

				await expect(authService.requireAuth(event)).resolves.not.toThrow();
				expect(mockVerify).toHaveBeenCalledWith('valid.jwt.token');
			});

			it('should throw error when no token is present', async () => {
				const event = createMockRequestEvent(); // No token

				await expect(authService.requireAuth(event)).rejects.toThrow(
					'No authentication token found'
				);
				expect(mockVerifier.verify).not.toHaveBeenCalled();
			});

			it('should throw error when token is empty string', async () => {
				const event = createMockRequestEvent(''); // Empty token

				await expect(authService.requireAuth(event)).rejects.toThrow(
					'No authentication token found'
				);
				expect(mockVerifier.verify).not.toHaveBeenCalled();
			});

			it('should throw error for invalid token', async () => {
				const mockVerify = vi.mocked(mockVerifier.verify);
				mockVerify.mockRejectedValue(new Error('Invalid token'));
				const event = createMockRequestEvent('invalid.token');

				await expect(authService.requireAuth(event)).rejects.toThrow(
					'Invalid authentication token'
				);
				expect(mockVerify).toHaveBeenCalledWith('invalid.token');
			});
		});
	});
});
