import * as DbTypes from './types.js';
import { z } from 'zod';

export const TRPC_ERROR_CODES = {
	NOT_FOUND: 'NOT_FOUND',
	BAD_REQUEST: 'BAD_REQUEST',
	INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

export const TRPC_ERROR_MESSAGES = {
	PHOTO_ARRAY_NOT_FOUND: 'Photo array not found',
	INVALID_INPUT: 'Invalid input provided',
	INTERNAL_SERVER_ERROR: 'An internal server error occurred'
} as const;

export interface PhotoArray {
	photoArrayId: string;
	photoUris: string[];
	timestamp: string;
	processedCount: number;
	location: string;
}

export interface ThumbnailCoordinates {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface PhotoArrayInput {
	thumbnailCoordinates: ThumbnailCoordinates[];
	timestamp: string;
	location: string;
}

export interface PhotoArrayCreationResponse {
	photoArray: PhotoArray;
	presignedUrls: string[];
}

export interface PhotoArrayUpdate {
	photoUris?: string[];
	processedCount?: number;
	location?: string;
}

const thumbnailCoordinatesSchema = z.object({
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number()
});

export const photoArrayInputSchema = z.object({
	thumbnailCoordinates: z.array(thumbnailCoordinatesSchema).min(1),
	timestamp: z.string(),
	location: z.string()
});

export const photoArrayUpdateSchema = z.object({
	photoUris: z.array(z.string()).optional(),
	processedCount: z.number().optional(),
	location: z.string().optional()
});

export const createItemSchema = z.object({
	item: photoArrayInputSchema,
	beforeRangeKey: z.string().optional(),
	afterRangeKey: z.string().optional()
});

export const getItemSchema = z.object({
	photoArrayId: z.string()
});

export const updateItemSchema = z.object({
	photoArrayId: z.string(),
	updates: photoArrayUpdateSchema
});

export const deleteItemSchema = z.object({
	photoArrayId: z.string()
});

export const getAllItemsSchema = z.object({});

export const moveItemSchema = z.object({
	photoArrayId: z.string(),
	beforeRangeKey: z.string().optional(),
	afterRangeKey: z.string().optional()
});

export function toApiType(dbItem: DbTypes.PhotoArray): PhotoArray {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { photoGalleryId, ...apiItem } = dbItem;
	return {
		...apiItem,
		photoUris: dbItem.photoUris
	};
}

export function toDbInputType(apiInput: PhotoArrayInput): DbTypes.PhotoArrayInput {
	return {
		...apiInput
	};
}

export function toDbUpdateType(apiUpdate: PhotoArrayUpdate): DbTypes.PhotoArrayUpdate {
	return {
		...apiUpdate,
		photoUris: apiUpdate.photoUris
	};
}
