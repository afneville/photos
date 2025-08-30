import { describe, it, expect, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { appRouter } from './trpc-router.js';
import {
	PhotoArrayNotFoundError,
	PhotoGalleryServiceError,
	PhotoArrayValidationError
} from './photo-gallery.service.js';
import { TRPC_ERROR_CODES, TRPC_ERROR_MESSAGES } from './api-types.js';
import type * as DbTypes from './types.js';
import type { IPhotoGalleryService } from './types.js';

describe('tRPC Router', () => {
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
			photoGalleryId: 'test-gallery-id'
		});
	};

	describe('getItem', () => {
		it('should return photo array without photoGalleryId successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const expectedPhotoArray: DbTypes.PhotoArray = {
				photoGalleryId: 'test-gallery-id',
				photoArrayId: 'test-array-id',
				photoUris: new Set(['uri1', 'uri2']),
				timestamp: '2023-01-01T00:00:00Z',
				processed: true,
				location: 'test-location'
			};

			mockPhotoGalleryService.getItem.mockResolvedValue(expectedPhotoArray);

			const result = await caller.getItem({ photoArrayId: 'test-array-id' });

			expect(result).toEqual({
				photoArrayId: 'test-array-id',
				photoUris: ['uri1', 'uri2'],
				timestamp: '2023-01-01T00:00:00Z',
				processed: true,
				location: 'test-location'
			});

			expect(mockPhotoGalleryService.getItem).toHaveBeenCalledWith(
				'test-gallery-id',
				'test-array-id'
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
				'test-gallery-id',
				'nonexistent-id'
			);
		});
	});

	describe('getAllItems', () => {
		it('should return all items without photoGalleryId successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const expectedPhotoArrays: DbTypes.PhotoArray[] = [
				{
					photoGalleryId: 'test-gallery-id',
					photoArrayId: 'array-1',
					photoUris: new Set(['uri1']),
					timestamp: '2023-01-01T00:00:00Z',
					processed: true,
					location: 'location-1'
				},
				{
					photoGalleryId: 'test-gallery-id',
					photoArrayId: 'array-2',
					photoUris: new Set(['uri2', 'uri3']),
					timestamp: '2023-01-02T00:00:00Z',
					processed: false,
					location: 'location-2'
				}
			];

			mockPhotoGalleryService.getAllItems.mockResolvedValue(expectedPhotoArrays);

			const result = await caller.getAllItems({});

			expect(result).toEqual([
				{
					photoArrayId: 'array-1',
					photoUris: ['uri1'],
					timestamp: '2023-01-01T00:00:00Z',
					processed: true,
					location: 'location-1'
				},
				{
					photoArrayId: 'array-2',
					photoUris: ['uri2', 'uri3'],
					timestamp: '2023-01-02T00:00:00Z',
					processed: false,
					location: 'location-2'
				}
			]);

			expect(mockPhotoGalleryService.getAllItems).toHaveBeenCalledWith('test-gallery-id');
		});
	});

	describe('createItem', () => {
		it('should create item successfully', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			const inputPhotoArray = {
				photoUris: ['uri1', 'uri2'],
				timestamp: '2023-01-01T00:00:00Z',
				processed: false,
				location: 'test-location'
			};

			const createdPhotoArray: DbTypes.PhotoArray = {
				photoGalleryId: 'test-gallery-id',
				photoArrayId: 'generated-id',
				photoUris: new Set(['uri1', 'uri2']),
				timestamp: '2023-01-01T00:00:00Z',
				processed: false,
				location: 'test-location'
			};

			mockPhotoGalleryService.createItem.mockResolvedValue(createdPhotoArray);

			const result = await caller.createItem({ item: inputPhotoArray });

			expect(result.photoUris).toEqual(['uri1', 'uri2']);
			expect(result).not.toHaveProperty('photoGalleryId');

			expect(mockPhotoGalleryService.createItem).toHaveBeenCalledWith(
				'test-gallery-id',
				{
					photoUris: new Set(['uri1', 'uri2']),
					timestamp: '2023-01-01T00:00:00Z',
					processed: false,
					location: 'test-location'
				},
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
				'test-gallery-id',
				'test-array-id'
			);
		});

		it('should throw INTERNAL_SERVER_ERROR tRPC error for PhotoGalleryServiceError', async () => {
			const mockPhotoGalleryService = createMockPhotoGalleryService();
			const caller = createTestCaller(mockPhotoGalleryService);

			mockPhotoGalleryService.deleteItem.mockRejectedValue(
				new PhotoGalleryServiceError('Delete failed')
			);

			await expect(caller.deleteItem({ photoArrayId: 'test-array-id' })).rejects.toSatisfy(
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
