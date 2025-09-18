import { appRouter, createContext, createCallerFactory } from './trpc-router';
import type { RequestEvent } from '@sveltejs/kit';

export async function createServerCaller(event: RequestEvent) {
	return createCallerFactory(appRouter)(await createContext(event));
}
