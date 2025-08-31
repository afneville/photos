import { appRouter, createContext } from './trpc-router';

export const caller = appRouter.createCaller(createContext());
