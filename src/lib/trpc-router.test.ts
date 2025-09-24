import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { appRouter, createCallerFactory } from './trpc-router.js';
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
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('./auth.service.js', () => ({
	isAuthenticated: vi.fn()
}));

import type { AuthService } from './auth.service.js';

const mockIsAuthenticated = vi.fn();

describe('tRPC Router with Authentication', () => {
	const DEFAULT_URI_LIST = ['uri1', 'uri2'];
	const DEFAULT_PHOTO_ARRAY_ID = 'test-array-id';
	const DEFAULT_TIMESTAMP = '2023-01-01T00:00:00Z';
	const DEFAULT_LOCATION = 'test-location';

	const DEFAULT_THUMBNAIL_COORDINATES = [
		{ x: 10, y: 20, w: 100, h: 150 },
		{ x: 50, y: 80, w: 200, h: 300 }
	];
	const TEST_GALLERY_ID = 'test-gallery';

	const DEFAULT_DB_PHOTO_ARRAY: DbTypes.PhotoArray = {
		photoGalleryId: TEST_GALLERY_ID,
		photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
		photoUris: ['uri1', 'uri2'],
		timestamp: DEFAULT_TIMESTAMP,
		processedCount: 0,
		location: DEFAULT_LOCATION
	};

	const DEFAULT_API_INPUT: PhotoArrayInput = {
		thumbnailCoordinates: DEFAULT_THUMBNAIL_COORDINATES,
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
		thumbnailCoordinates: DEFAULT_THUMBNAIL_COORDINATES,
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

	const createMockRequestEvent = (authToken?: string): RequestEvent =>
		({
			cookies: {
				get: vi
					.fn()
					.mockImplementation((name: string) => (name === 'auth_token' ? authToken : null))
			}
		}) as unknown as RequestEvent;

	const createCaller = createCallerFactory(appRouter);

	const createTestCallerWithAuth = (
		mockPhotoGalleryService: IPhotoGalleryService,
		token?: string
	) => {
		const mockAuthService = {
			isAuthenticated: mockIsAuthenticated,
			getTokenFromCookies: vi.fn().mockReturnValue(token || null),
			requireAuth: vi.fn()
		} as unknown as AuthService;

		return createCaller({
			photoGalleryService: mockPhotoGalleryService,
			photoGalleryId: TEST_GALLERY_ID,
			authService: mockAuthService,
			token,
			event: createMockRequestEvent(token)
		});
	};

	const createUnauthenticatedCaller = (mockPhotoGalleryService: IPhotoGalleryService) => {
		return createTestCallerWithAuth(mockPhotoGalleryService, undefined);
	};

	const createAuthenticatedCaller = (mockPhotoGalleryService: IPhotoGalleryService) => {
		return createTestCallerWithAuth(mockPhotoGalleryService, 'valid-token');
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAuthenticated.mockImplementation(async (token: string) => {
			return token === 'valid-token';
		});
	});

	describe('Public Endpoints', () => {
		describe('getPublicItems', () => {
			it('should return all items without authentication', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				const expectedPhotoArrays: DbTypes.PhotoArray[] = [
					{ ...DEFAULT_DB_PHOTO_ARRAY, photoArrayId: 'array-1', processedCount: 2 },
					{ ...DEFAULT_DB_PHOTO_ARRAY, photoArrayId: 'array-2', processedCount: 2 }
				];

				mockPhotoGalleryService.getAllItems.mockResolvedValue(expectedPhotoArrays);

				const result = await caller.getPublicItems({});

				expect(result).toEqual([
					{ ...DEFAULT_API_RESPONSE, photoArrayId: 'array-1', processedCount: 2 },
					{ ...DEFAULT_API_RESPONSE, photoArrayId: 'array-2', processedCount: 2 }
				]);

				expect(mockPhotoGalleryService.getAllItems).toHaveBeenCalledWith(TEST_GALLERY_ID);
			});

			it('should work with authentication as well', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				const expectedPhotoArrays: DbTypes.PhotoArray[] = [
					{ ...DEFAULT_DB_PHOTO_ARRAY, processedCount: 2 }
				];
				mockPhotoGalleryService.getAllItems.mockResolvedValue(expectedPhotoArrays);

				const result = await caller.getPublicItems({});

				expect(result).toEqual([{ ...DEFAULT_API_RESPONSE, processedCount: 2 }]);
				expect(mockPhotoGalleryService.getAllItems).toHaveBeenCalledWith(TEST_GALLERY_ID);
			});

			it('should filter out items where processedCount does not equal number of URIs', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				const fullyProcessedArray: DbTypes.PhotoArray = {
					...DEFAULT_DB_PHOTO_ARRAY,
					photoArrayId: 'fully-processed',
					photoUris: ['uri1', 'uri2'],
					processedCount: 2
				};

				const partiallyProcessedArray: DbTypes.PhotoArray = {
					...DEFAULT_DB_PHOTO_ARRAY,
					photoArrayId: 'partially-processed',
					photoUris: ['uri1', 'uri2', 'uri3'],
					processedCount: 1
				};

				const unprocessedArray: DbTypes.PhotoArray = {
					...DEFAULT_DB_PHOTO_ARRAY,
					photoArrayId: 'unprocessed',
					photoUris: ['uri1', 'uri2'],
					processedCount: 0
				};

				const expectedPhotoArrays: DbTypes.PhotoArray[] = [
					fullyProcessedArray,
					partiallyProcessedArray,
					unprocessedArray
				];

				mockPhotoGalleryService.getAllItems.mockResolvedValue(expectedPhotoArrays);

				const result = await caller.getPublicItems({});

				expect(result).toEqual([
					{
						photoArrayId: 'fully-processed',
						photoUris: ['uri1', 'uri2'],
						timestamp: DEFAULT_TIMESTAMP,
						processedCount: 2,
						location: DEFAULT_LOCATION
					}
				]);

				expect(mockPhotoGalleryService.getAllItems).toHaveBeenCalledWith(TEST_GALLERY_ID);
			});
		});
	});

	describe('Protected Endpoints - Authentication Required', () => {
		describe('createItem', () => {
			it('should create item successfully when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

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

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(caller.createItem({ item: DEFAULT_API_INPUT })).rejects.toSatisfy((error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe('UNAUTHORIZED');
					expect(trpcError.message).toBe('Authentication required');
					return true;
				});

				expect(mockPhotoGalleryService.createItem).not.toHaveBeenCalled();
			});
		});

		describe('getItem', () => {
			it('should return photo array when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				const expectedPhotoArray = DEFAULT_DB_PHOTO_ARRAY;
				mockPhotoGalleryService.getItem.mockResolvedValue(expectedPhotoArray);

				const result = await caller.getItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID });

				expect(result).toEqual(DEFAULT_API_RESPONSE);
				expect(mockPhotoGalleryService.getItem).toHaveBeenCalledWith(
					TEST_GALLERY_ID,
					DEFAULT_PHOTO_ARRAY_ID
				);
			});

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(caller.getItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID })).rejects.toSatisfy(
					(error) => {
						expect(error).toBeInstanceOf(TRPCError);
						const trpcError = error as TRPCError;
						expect(trpcError.code).toBe('UNAUTHORIZED');
						expect(trpcError.message).toBe('Authentication required');
						return true;
					}
				);

				expect(mockPhotoGalleryService.getItem).not.toHaveBeenCalled();
			});

			it('should throw NOT_FOUND tRPC error for PhotoArrayNotFoundError when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

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
			it('should return all items when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

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

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(caller.getAllItems({})).rejects.toSatisfy((error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe('UNAUTHORIZED');
					expect(trpcError.message).toBe('Authentication required');
					return true;
				});

				expect(mockPhotoGalleryService.getAllItems).not.toHaveBeenCalled();
			});
		});

		describe('updateItem', () => {
			it('should update item when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				const updates = { location: 'updated-location' };
				const updatedPhotoArray = { ...DEFAULT_DB_PHOTO_ARRAY, location: 'updated-location' };

				mockPhotoGalleryService.updateItem.mockResolvedValue(updatedPhotoArray);

				const result = await caller.updateItem({
					photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
					updates
				});

				expect(result.location).toBe('updated-location');
				expect(mockPhotoGalleryService.updateItem).toHaveBeenCalledWith(
					TEST_GALLERY_ID,
					DEFAULT_PHOTO_ARRAY_ID,
					updates
				);
			});

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(
					caller.updateItem({
						photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
						updates: { location: 'new-location' }
					})
				).rejects.toSatisfy((error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe('UNAUTHORIZED');
					expect(trpcError.message).toBe('Authentication required');
					return true;
				});

				expect(mockPhotoGalleryService.updateItem).not.toHaveBeenCalled();
			});
		});

		describe('deleteItem', () => {
			it('should delete item when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				mockPhotoGalleryService.deleteItem.mockResolvedValue(undefined);

				await caller.deleteItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID });

				expect(mockPhotoGalleryService.deleteItem).toHaveBeenCalledWith(
					TEST_GALLERY_ID,
					DEFAULT_PHOTO_ARRAY_ID
				);
			});

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(caller.deleteItem({ photoArrayId: DEFAULT_PHOTO_ARRAY_ID })).rejects.toSatisfy(
					(error) => {
						expect(error).toBeInstanceOf(TRPCError);
						const trpcError = error as TRPCError;
						expect(trpcError.code).toBe('UNAUTHORIZED');
						expect(trpcError.message).toBe('Authentication required');
						return true;
					}
				);

				expect(mockPhotoGalleryService.deleteItem).not.toHaveBeenCalled();
			});

			it('should throw INTERNAL_SERVER_ERROR for PhotoGalleryServiceError when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

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

			it('should throw BAD_REQUEST for PhotoArrayValidationError when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				mockPhotoGalleryService.deleteItem.mockRejectedValue(
					new PhotoArrayValidationError('Invalid photo array ID')
				);

				await expect(caller.deleteItem({ photoArrayId: 'invalid-id' })).rejects.toSatisfy(
					(error) => {
						expect(error).toBeInstanceOf(TRPCError);
						const trpcError = error as TRPCError;
						expect(trpcError.code).toBe(TRPC_ERROR_CODES.BAD_REQUEST);
						expect(trpcError.message).toBe(TRPC_ERROR_MESSAGES.INVALID_INPUT);
						return true;
					}
				);
			});

			it('should throw INTERNAL_SERVER_ERROR for unknown errors when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

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

		describe('moveItem', () => {
			it('should move item when authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createAuthenticatedCaller(mockPhotoGalleryService);

				const movedPhotoArray = { ...DEFAULT_DB_PHOTO_ARRAY };
				mockPhotoGalleryService.moveItem.mockResolvedValue(movedPhotoArray);

				const result = await caller.moveItem({
					photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
					beforeRangeKey: 'before-key',
					afterRangeKey: 'after-key'
				});

				expect(result).toEqual(DEFAULT_API_RESPONSE);
				expect(mockPhotoGalleryService.moveItem).toHaveBeenCalledWith(
					TEST_GALLERY_ID,
					DEFAULT_PHOTO_ARRAY_ID,
					'before-key',
					'after-key'
				);
			});

			it('should throw UNAUTHORIZED when not authenticated', async () => {
				const mockPhotoGalleryService = createMockPhotoGalleryService();
				const caller = createUnauthenticatedCaller(mockPhotoGalleryService);

				await expect(
					caller.moveItem({
						photoArrayId: DEFAULT_PHOTO_ARRAY_ID,
						beforeRangeKey: 'before-key',
						afterRangeKey: 'after-key'
					})
				).rejects.toSatisfy((error) => {
					expect(error).toBeInstanceOf(TRPCError);
					const trpcError = error as TRPCError;
					expect(trpcError.code).toBe('UNAUTHORIZED');
					expect(trpcError.message).toBe('Authentication required');
					return true;
				});

				expect(mockPhotoGalleryService.moveItem).not.toHaveBeenCalled();
			});
		});
	});
});
