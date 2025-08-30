import * as DbTypes from './types.js';
import { z } from 'zod';

// tRPC Error Codes
export const TRPC_ERROR_CODES = {
	NOT_FOUND: 'NOT_FOUND',
	BAD_REQUEST: 'BAD_REQUEST', 
	INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

// tRPC Error Messages
export const TRPC_ERROR_MESSAGES = {
	PHOTO_ARRAY_NOT_FOUND: 'Photo array not found',
	INVALID_INPUT: 'Invalid input provided',
	INTERNAL_SERVER_ERROR: 'An internal server error occurred'
} as const;

// API types that use arrays instead of Sets for JSON compatibility
export interface PhotoArray {
	photoArrayId: string;
	photoUris: string[];
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayInput {
	photoUris: string[];
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayUpdate {
	photoUris?: string[];
	processed?: boolean;
	location?: string;
}

// Zod schemas
export const photoArrayInputSchema = z.object({
	photoUris: z.array(z.string()),
	timestamp: z.string(),
	processed: z.boolean(),
	location: z.string()
});

export const photoArrayUpdateSchema = z.object({
	photoUris: z.array(z.string()).optional(),
	processed: z.boolean().optional(),
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

// Conversion functions
export function toApiType(dbItem: DbTypes.PhotoArray): PhotoArray {
	const { photoGalleryId, ...apiItem } = dbItem;
	return {
		...apiItem,
		photoUris: Array.from(dbItem.photoUris)
	};
}

export function toDbInputType(apiInput: PhotoArrayInput): DbTypes.PhotoArrayInput {
	return {
		...apiInput,
		photoUris: new Set(apiInput.photoUris)
	};
}

export function toDbUpdateType(apiUpdate: PhotoArrayUpdate): DbTypes.PhotoArrayUpdate {
	return {
		...apiUpdate,
		photoUris: apiUpdate.photoUris ? new Set(apiUpdate.photoUris) : undefined
	};
}