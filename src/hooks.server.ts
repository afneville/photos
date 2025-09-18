import { createTRPCHandle } from 'trpc-sveltekit';
import { appRouter, createContext } from '$lib/trpc-router.js';
import type { Handle } from '@sveltejs/kit';

const trpcHandle = createTRPCHandle({
	router: appRouter,
	url: '/api/trpc',
	createContext: (event) => createContext(event)
});

export const handle: Handle = trpcHandle;
