import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
	PhotoGalleryService,
	PhotoArrayNotFoundError,
	PhotoGalleryServiceError,
	PhotoArrayValidationError
} from './photo-gallery.service.js';
import { env } from '$env/dynamic/private';
import type { PhotoArray, PhotoArrayCreationResponse } from './api-types.js';
import type { IPhotoGalleryService } from './types.js';
import {
	toApiType,
	toDbInputType,
	toDbUpdateType,
	createItemSchema,
	getItemSchema,
	updateItemSchema,
	deleteItemSchema,
	getAllItemsSchema,
	moveItemSchema,
	TRPC_ERROR_CODES,
	TRPC_ERROR_MESSAGES
} from './api-types.js';
import { isAuthenticated } from './auth.js';
import type { RequestEvent } from '@sveltejs/kit';

interface Context {
	photoGalleryService: IPhotoGalleryService;
	photoGalleryId: string;
	token?: string;
	event: RequestEvent;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

// Middleware that ensures user is authenticated
const authMiddleware = t.middleware(async ({ ctx, next }) => {
	if (!ctx.token) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Authentication required'
		});
	}

	const authenticated = await isAuthenticated(ctx.token);
	if (!authenticated) {
		throw new TRPCError({
			code: 'UNAUTHORIZED',
			message: 'Authentication required'
		});
	}

	return next({
		ctx
	});
});

// Protected procedure that requires authentication
export const protectedProcedure = publicProcedure.use(authMiddleware);

function handleServiceError(error: unknown): never {
	if (error instanceof PhotoArrayNotFoundError) {
		throw new TRPCError({
			code: TRPC_ERROR_CODES.NOT_FOUND,
			message: TRPC_ERROR_MESSAGES.PHOTO_ARRAY_NOT_FOUND
		});
	}
	if (error instanceof PhotoArrayValidationError) {
		throw new TRPCError({
			code: TRPC_ERROR_CODES.BAD_REQUEST,
			message: TRPC_ERROR_MESSAGES.INVALID_INPUT
		});
	}
	if (error instanceof PhotoGalleryServiceError) {
		throw new TRPCError({
			code: TRPC_ERROR_CODES.INTERNAL_SERVER_ERROR,
			message: TRPC_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
		});
	}
	throw new TRPCError({
		code: TRPC_ERROR_CODES.INTERNAL_SERVER_ERROR,
		message: TRPC_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
	});
}

export async function createContext(event: RequestEvent): Promise<Context> {
	if (!env.PHOTO_GALLERY_ID) {
		throw new Error('PHOTO_GALLERY_ID environment variable is required');
	}

	const token = event.cookies.get('auth_token') || undefined;

	return {
		photoGalleryService: new PhotoGalleryService(),
		photoGalleryId: env.PHOTO_GALLERY_ID,
		token,
		event
	};
}

export const appRouter = router({
	getPublicItems: publicProcedure
		.input(getAllItemsSchema)
		.query(
			async ({
				ctx
			}: {
				ctx: Context;
				input: z.infer<typeof getAllItemsSchema>;
			}): Promise<PhotoArray[]> => {
				try {
					const dbItems = await ctx.photoGalleryService.getAllItems(ctx.photoGalleryId);
					return dbItems
						.map(toApiType)
						.filter((photoArray) => photoArray.processedCount == photoArray.photoUris.length);
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	createItem: protectedProcedure
		.input(createItemSchema)
		.mutation(
			async ({
				ctx,
				input
			}: {
				ctx: Context;
				input: z.infer<typeof createItemSchema>;
			}): Promise<PhotoArrayCreationResponse> => {
				try {
					const response = await ctx.photoGalleryService.createItem(
						ctx.photoGalleryId,
						toDbInputType(input.item),
						input.beforeRangeKey,
						input.afterRangeKey
					);
					return {
						photoArray: toApiType(response.photoArray),
						presignedUrls: response.presignedUrls
					};
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	getItem: protectedProcedure
		.input(getItemSchema)
		.query(
			async ({
				ctx,
				input
			}: {
				ctx: Context;
				input: z.infer<typeof getItemSchema>;
			}): Promise<PhotoArray> => {
				try {
					const dbItem = await ctx.photoGalleryService.getItem(
						ctx.photoGalleryId,
						input.photoArrayId
					);
					return toApiType(dbItem);
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	updateItem: protectedProcedure
		.input(updateItemSchema)
		.mutation(
			async ({
				ctx,
				input
			}: {
				ctx: Context;
				input: z.infer<typeof updateItemSchema>;
			}): Promise<PhotoArray> => {
				try {
					const dbItem = await ctx.photoGalleryService.updateItem(
						ctx.photoGalleryId,
						input.photoArrayId,
						toDbUpdateType(input.updates)
					);
					return toApiType(dbItem);
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	deleteItem: protectedProcedure
		.input(deleteItemSchema)
		.mutation(
			async ({
				ctx,
				input
			}: {
				ctx: Context;
				input: z.infer<typeof deleteItemSchema>;
			}): Promise<void> => {
				try {
					await ctx.photoGalleryService.deleteItem(ctx.photoGalleryId, input.photoArrayId);
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	getAllItems: protectedProcedure
		.input(getAllItemsSchema)
		.query(
			async ({
				ctx
			}: {
				ctx: Context;
				input: z.infer<typeof getAllItemsSchema>;
			}): Promise<PhotoArray[]> => {
				try {
					const dbItems = await ctx.photoGalleryService.getAllItems(ctx.photoGalleryId);
					return dbItems.map(toApiType);
				} catch (error) {
					handleServiceError(error);
				}
			}
		),

	moveItem: protectedProcedure
		.input(moveItemSchema)
		.mutation(
			async ({
				ctx,
				input
			}: {
				ctx: Context;
				input: z.infer<typeof moveItemSchema>;
			}): Promise<PhotoArray> => {
				try {
					const dbItem = await ctx.photoGalleryService.moveItem(
						ctx.photoGalleryId,
						input.photoArrayId,
						input.beforeRangeKey,
						input.afterRangeKey
					);
					return toApiType(dbItem);
				} catch (error) {
					handleServiceError(error);
				}
			}
		)
});

export type AppRouter = typeof appRouter;
