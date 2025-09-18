import { appRouter, createContext, createCallerFactory } from './trpc-router';
import type { RequestEvent } from '@sveltejs/kit';

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller(event: RequestEvent) {
	return createCaller(await createContext(event));
}
