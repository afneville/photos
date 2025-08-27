import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PhotoGalleryService } from './photo-gallery.service.js';
import type { PhotoArrayInput, PhotoArrayUpdate } from './api-types.js';
import { toApiType, toDbInputType, toDbUpdateType } from './api-types.js';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

const photoGalleryService = new PhotoGalleryService();

export const appRouter = router({
	createItem: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string(),
				item: z.object({
					photoUris: z.array(z.string()),
					timestamp: z.string(),
					processed: z.boolean(),
					location: z.string()
				}),
				beforeRangeKey: z.string().optional(),
				afterRangeKey: z.string().optional()
			})
		)
		.mutation(async ({ input }) => {
			const dbItem = await photoGalleryService.createItem(
				input.photoGalleryId,
				toDbInputType(input.item),
				input.beforeRangeKey,
				input.afterRangeKey
			);
			return toApiType(dbItem);
		}),

	getItem: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string(),
				photoArrayId: z.string()
			})
		)
		.query(async ({ input }) => {
			const dbItem = await photoGalleryService.getItem(
				input.photoGalleryId,
				input.photoArrayId
			);
			return toApiType(dbItem);
		}),

	updateItem: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string(),
				photoArrayId: z.string(),
				updates: z.object({
					photoUris: z.array(z.string()).optional(),
					processed: z.boolean().optional(),
					location: z.string().optional()
				})
			})
		)
		.mutation(async ({ input }) => {
			const dbItem = await photoGalleryService.updateItem(
				input.photoGalleryId,
				input.photoArrayId,
				toDbUpdateType(input.updates)
			);
			return toApiType(dbItem);
		}),

	deleteItem: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string(),
				photoArrayId: z.string()
			})
		)
		.mutation(async ({ input }) => {
			await photoGalleryService.deleteItem(input.photoGalleryId, input.photoArrayId);
		}),

	getAllItems: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string()
			})
		)
		.query(async ({ input }) => {
			const dbItems = await photoGalleryService.getAllItems(input.photoGalleryId);
			return dbItems.map(toApiType);
		}),

	moveItem: publicProcedure
		.input(
			z.object({
				photoGalleryId: z.string(),
				photoArrayId: z.string(),
				beforeRangeKey: z.string().optional(),
				afterRangeKey: z.string().optional()
			})
		)
		.mutation(async ({ input }) => {
			const dbItem = await photoGalleryService.moveItem(
				input.photoGalleryId,
				input.photoArrayId,
				input.beforeRangeKey,
				input.afterRangeKey
			);
			return toApiType(dbItem);
		})
});

export type AppRouter = typeof appRouter;