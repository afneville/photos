import { describe, it, expect, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { appRouter } from './trpc-router.js';
import {
	PhotoArrayNotFoundError,
	PhotoGalleryServiceError,
	PhotoArrayValidationError
} from './photo-gallery.service.js';
import {
	TRPC_ERROR_CODES,
	TRPC_ERROR_MESSAGES,
	type PhotoArray,
	type PhotoArrayInput
} from './api-types.js';
import type * as DbTypes from './types.js';
import type { IPhotoGalleryService } from './types.js';

describe('tRPC Router', () => {
	const DEFAULT_URI_LIST = ['uri1', 'uri2'];
	const DEFAULT_PHOTO_ARRAY_ID = 'test-array-id';
	const DEFAULT_TIMESTAMP = '2023-01-01T00:00:00Z';
	const DEFAULT_LOCATION = 'test-location';
	const DEFAULT_URIS = new Set(['uri1', 'uri2']);
	const DEFAULT_PHOTO_COUNT = 2;
	const TEST_GALLERY_ID = 'test-gallery';

	const DEFAULT_DB_PHOTO_ARRAY: DbTypes.PhotoArray = {
		photoGalleryId: TEST_GALLERY_ID,
		photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
		photoUris: DEFAULT_URIS,
		timestamp: DEFAULT_TIMESTAMP,
		processedCount: 0,
		location: DEFAULT_LOCATION
	};

	const DEFAULT_API_INPUT: PhotoArrayInput = {
		photoCount: DEFAULT_PHOTO_COUNT,
		timestamp: DEFAULT_TIMESTAMP,
		location: DEFAULT_LOCATION
	};

	const DEFAULT_API_RESPONSE: PhotoArray = {
		photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
		photoUris: DEFAULT_URI_LIST,
		timestamp: DEFAULT_TIMESTAMP,
		processedCount: 0,
		location: DEFAULT_LOCATION
	};

	const DEFAULT_DB_INPUT: DbTypes.PhotoArrayInput = {
		photoCount: DEFAULT_PHOTO_COUNT,
		timestamp: DEFAULT_TIMESTAMP,
		location: DEFAULT_LOCATION
	};

	const createMockPhotoGalleryService = () => ({
		getItem: vi.fn(),
		getAllItems: vi.fn(),
		createItem: vi.fn(),
		updateItem: vi.fn(),
		deleteItem: vi.fn(),
		moveItem: vi.fn()
	});

	const createTestCaller = (mockPhotoGalleryService: IPhotoGalleryService) => {
		return appRouter.createCaller({
			photoGalleryService: mockPhotoGalleryService,
			photoGalleryId: TEST_GALLERY_ID
		});
	};

	describe('getItem', () => {
		it('should return photo array without photoGalleryId successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const expectedPhotoArray = DEFAULT_DB_PHOTO_ARRAY;

			mockPhotoGalleryService.getItem.mockResolvedValue(expectedPhotoArray);

			const result = await caller.getItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID });

			expect(result).toEqual(DEFAULT_API_RESPONSE);

			expect(mockPhotoGalleryService.getItem).toHaveBeenCalledWith(
				TEST_GALLERY_ID,
				DEFAULT_PHOTO_ARRAY_ID
			);
		});

		it('should throw NOT_FOUND tRPC error for PhotoArrayNotFoundError', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.getItem.mockRejectedValue(
				new PhotoArrayNotFoundError('nonexistent-id')
			);

			await expect(caller.getItem({ photoArrayId: 'nonexistent-id' })).rejects.toSatisfy(
				(error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe(TRPC_ERROR_CODES.NOT_FOUND);
					expect(trpcError.message).toBe(TRPC_ERROR_MESSAGES.PHOTO_ARRAY_NOT_FOUND);
					return true;
				}
			);

			expect(mockPhotoGalleryService.getItem).toHaveBeenCalledWith(
				TEST_GALLERY_ID,
				'nonexistent-id'
			);
		});
	});

	describe('getAllItems', () => {
		it('should return all items without photoGalleryId successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const expectedPhotoArrays: DbTypes.PhotoArray[] = [
				{ ...DEFAULT_DB_PHOTO_ARRAY, photoArrayId: 'array-1' },
				{ ...DEFAULT_DB_PHOTO_ARRAY, photoArrayId: 'array-2' }
			];

			mockPhotoGalleryService.getAllItems.mockResolvedValue(expectedPhotoArrays);

			const result = await caller.getAllItems({});

			expect(result).toEqual([
				{ ...DEFAULT_API_RESPONSE, photoArrayId: 'array-1' },
				{ ...DEFAULT_API_RESPONSE, photoArrayId: 'array-2' }
			]);

			expect(mockPhotoGalleryService.getAllItems).toHaveBeenCalledWith(TEST_GALLERY_ID);
		});
	});

	describe('createItem', () => {
		it('should create item successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const inputPhotoArray = DEFAULT_API_INPUT;
			const createdPhotoArray = { ...DEFAULT_DB_PHOTO_ARRAY, photoArrayId: 'generated-id' };

			const mockResponse = {
				photoArray: createdPhotoArray,
				presignedUrls: ['url1', 'url2']
			};
			mockPhotoGalleryService.createItem.mockResolvedValue(mockResponse);

			const result = await caller.createItem({ item: inputPhotoArray });

			expect(result.photoArray.photoUris).toEqual(['uri1', 'uri2']);
			expect(result.photoArray).not.toHaveProperty('photoGalleryId');
			expect(result.presignedUrls).toEqual(['url1', 'url2']);

			expect(mockPhotoGalleryService.createItem).toHaveBeenCalledWith(
				TEST_GALLERY_ID,
				DEFAULT_DB_INPUT,
				undefined,
				undefined
			);
		});
	});

	describe('deleteItem', () => {
		it('should delete item successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.deleteItem.mockResolvedValue(undefined);

			await caller.deleteItem({ photoArrayId: 'test-array-id' });

			expect(mockPhotoGalleryService.deleteItem).toHaveBeenCalledWith(
				TEST_GALLERY_ID,
				DEFAULT_PHOTO_ARRAY_ID
			);
		});

		it('should throw INTERNAL_SERVER_ERROR tRPC error for PhotoGalleryServiceError', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.deleteItem.mockRejectedValue(
				new PhotoGalleryServiceError('Delete failed')
			);

			await expect(caller.deleteItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID })).rejects.toSatisfy(
				(error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe(TRPC_ERROR_CODES.INTERNAL_SERVER_ERROR);
					expect(trpcError.message).toBe(TRPC_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
					return true;
				}
			);
		});

		it('should throw BAD_REQUEST tRPC error for PhotoArrayValidationError', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.deleteItem.mockRejectedValue(
				new PhotoArrayValidationError('Invalid photo array ID')
			);

			await expect(caller.deleteItem({ photoArrayId: 'invalid-id' })).rejects.toSatisfy((error) => {
				expect(error).toBeInstanceOf(TRPCError);
				const trpcError = error as TRPCError;
				expect(trpcError.code).toBe(TRPC_ERROR_CODES.BAD_REQUEST);
				expect(trpcError.message).toBe(TRPC_ERROR_MESSAGES.INVALID_INPUT);
				return true;
			});
		});

		it('should throw INTERNAL_SERVER_ERROR tRPC error for unknown service errors', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.deleteItem.mockRejectedValue(new Error('Unexpected failure'));

			await expect(caller.deleteItem({ photoArrayId: 'test-id' })).rejects.toSatisfy((error) => {
				expect(error).toBeInstanceOf(TRPCError);
				const trpcError = error as TRPCError;
				expect(trpcError.code).toBe(TRPC_ERROR_CODES.INTERNAL_SERVER_ERROR);
				expect(trpcError.message).toBe(TRPC_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
				return true;
			});
		});
	});
});
