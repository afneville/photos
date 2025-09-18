import { appRouter, createContext } from './trpc-router';
import type { RequestEvent } from '@sveltejs/kit';

export async function createServerCaller(event: RequestEvent) {
	return appRouter.createCaller(await createContext(event));
}

// For backward compatibility - creates a caller without authentication
// This should only be used in contexts where authentication is handled separately
export async function createUnauthenticatedCaller() {
	const mockEvent = {
		cookies: {
			get: () => null
		}
	} as RequestEvent;
	
	return appRouter.createCaller(await createContext(mockEvent));
}
