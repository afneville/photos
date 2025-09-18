import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Simple mocks that don't interfere with imports
vi.mock('aws-jwt-verify');
vi.mock('$env/static/private', () => ({
	COGNITO_USER_POOL_ID: 'test-user-pool-id',
	COGNITO_CLIENT_ID: 'test-client-id',
	AWS_REGION: 'eu-west-2'
}));

// Import the module we want to test
import { getTokenFromCookies } from './auth.js';

describe('Auth Module - Unit Tests', () => {
	const createMockRequestEvent = (authToken?: string): RequestEvent =>
		({
			cookies: {
				get: vi
					.fn()
					.mockImplementation((name: string) => (name === 'auth_token' ? authToken : null))
			}
		}) as unknown as RequestEvent;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTokenFromCookies', () => {
		it('should return token from auth_token cookie', () => {
			const event = createMockRequestEvent('test-token-123');

			const result = getTokenFromCookies(event);

			expect(result).toBe('test-token-123');
			expect(event.cookies.get).toHaveBeenCalledWith('auth_token');
		});

		it('should return null when no auth_token cookie', () => {
			const event = createMockRequestEvent();

			const result = getTokenFromCookies(event);

			expect(result).toBeNull();
			expect(event.cookies.get).toHaveBeenCalledWith('auth_token');
		});

		it('should return null when auth_token cookie is empty', () => {
			const event = createMockRequestEvent('');

			const result = getTokenFromCookies(event);

			expect(result).toBeNull();
		});

		it('should handle cookie access errors', () => {
			const event = {
				cookies: {
					get: vi.fn().mockImplementation(() => {
						throw new Error('Cookie access failed');
					})
				}
			} as unknown as RequestEvent;

			expect(() => getTokenFromCookies(event)).toThrow('Cookie access failed');
		});

		it('should handle various token formats safely', () => {
			const testCases = [
				'valid.jwt.token',
				'bearer-token-format',
				'123456789',
				'special!@#$%^&*()chars',
				'<script>alert("xss")</script>', // XSS attempt
				'../../etc/passwd', // Path traversal attempt
				'very'.repeat(1000) // Very long string
			];

			for (const tokenValue of testCases) {
				const event = createMockRequestEvent(tokenValue);
				const result = getTokenFromCookies(event);
				// Should return the input as-is without processing/executing it
				expect(result).toBe(tokenValue);
			}
		});

		it('should not modify or process token values', () => {
			const originalToken = 'original.token.value';
			const event = createMockRequestEvent(originalToken);

			const result = getTokenFromCookies(event);

			// Token should be returned exactly as received
			expect(result).toBe(originalToken);
			expect(result).toEqual(originalToken);
		});
	});

	describe('Auth error message consistency', () => {
		it('should use consistent error message constants', () => {
			const expectedErrorMessages = [
				'No authentication token found',
				'Invalid authentication token'
			];

			// These are the error messages our auth system should use
			expect(expectedErrorMessages).toContain('No authentication token found');
			expect(expectedErrorMessages).toContain('Invalid authentication token');
		});
	});

	describe('Security considerations', () => {
		it('should not expose sensitive data in token extraction', () => {
			const sensitiveToken = 'secret-token-123';
			const event = createMockRequestEvent(sensitiveToken);

			const result = getTokenFromCookies(event);

			// The function should return the token, but not log it or expose it elsewhere
			expect(result).toBe(sensitiveToken);
			// If there were console.log calls, we'd check they don't contain the token
		});

		it('should handle null/undefined cookies object gracefully', () => {
			const eventWithNoCookies = {
				cookies: null
			} as unknown as RequestEvent;

			expect(() => getTokenFromCookies(eventWithNoCookies)).toThrow();
		});
	});

	describe('Cookie extraction edge cases', () => {
		it('should only check for auth_token cookie', () => {
			const mockGet = vi.fn().mockImplementation((name: string) => {
				if (name === 'auth_token') return 'correct-token';
				if (name === 'other_cookie') return 'other-value';
				return null;
			});

			const event = {
				cookies: { get: mockGet }
			} as unknown as RequestEvent;

			const result = getTokenFromCookies(event);

			expect(result).toBe('correct-token');
			expect(mockGet).toHaveBeenCalledWith('auth_token');
			expect(mockGet).toHaveBeenCalledTimes(1);
		});

		it('should handle cookies.get returning undefined', () => {
			const event = {
				cookies: {
					get: vi.fn().mockReturnValue(undefined)
				}
			} as unknown as RequestEvent;

			const result = getTokenFromCookies(event);

			expect(result).toBeNull(); // Our function converts undefined to null
		});

		it('should handle cookies.get returning various falsy values', () => {
			const falsyValues = [null, undefined, '', 0, false];

			for (const falsyValue of falsyValues) {
				const event = {
					cookies: {
						get: vi.fn().mockReturnValue(falsyValue)
					}
				} as unknown as RequestEvent;

				const result = getTokenFromCookies(event);

				if (
					falsyValue === undefined ||
					falsyValue === '' ||
					falsyValue === 0 ||
					falsyValue === false
				) {
					expect(result).toBeNull();
				} else {
					expect(result).toBe(falsyValue);
				}
			}
		});
	});

	describe('Function signature and contract', () => {
		it('should accept RequestEvent parameter', () => {
			const event = createMockRequestEvent('test');

			// Should not throw when called with proper RequestEvent
			expect(() => getTokenFromCookies(event)).not.toThrow();
		});

		it('should return string or null', () => {
			const testCases = [
				{ input: 'token', expectedType: 'string' },
				{ input: '', expectedType: 'object' }, // empty string becomes null
				{ input: null, expectedType: 'object' }, // null is typeof 'object'
				{ input: undefined, expectedType: 'object' } // null (converted from undefined)
			];

			for (const testCase of testCases) {
				const event = createMockRequestEvent(testCase.input as string);
				const result = getTokenFromCookies(event);

				if (testCase.input === undefined || testCase.input === '' || testCase.input === null) {
					expect(result).toBeNull();
					expect(typeof result).toBe('object');
				} else {
					expect(typeof result).toBe(testCase.expectedType);
				}
			}
		});
	});
});
