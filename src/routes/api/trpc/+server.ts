import type { RequestHandler } from '@sveltejs/kit';
import { createTRPCHandler } from 'trpc-sveltekit';
import { appRouter } from '$lib/trpc-router.js';

const handler = createTRPCHandler({
	router: appRouter,
	createContext: () => ({})
});

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;