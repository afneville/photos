import * as DbTypes from './types.js';

// API types that use arrays instead of Sets for JSON compatibility
export interface PhotoArray {
	photoGalleryId: string;
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

// Conversion functions
export function toApiType(dbItem: DbTypes.PhotoArray): PhotoArray {
	return {
		...dbItem,
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