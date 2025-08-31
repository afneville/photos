import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
	setupTestTable,
	teardownTestTable,
	getTestClient,
	startContainer,
	stopContainer,
	TEST_TABLE,
	TEST_PARTITION_KEY
} from './test-setup.js';
import type { PhotoArray, PhotoArrayInput } from './types.js';
import {
	PhotoGalleryService,
	PhotoArrayNotFoundError,
	PhotoArrayValidationError
} from './photo-gallery.service.js';

vi.mock('$env/dynamic/private', () => ({
	DYNAMODB_TABLE: TEST_TABLE,
	PARTITION_KEY: TEST_PARTITION_KEY,
	AWS_REGION: 'eu-west-2'
}));

describe('PhotoGalleryService', () => {
	let service: PhotoGalleryService;
	let client: DynamoDBDocumentClient;

	// Test data constants
	const DEFAULT_TIMESTAMP = '2024-08-24T10:00:00.000Z';
	const DEFAULT_LOCATION = 'Dublin, Ireland';
	const DEFAULT_URIS = new Set(['uri1', 'uri2']);

	const DEFAULT_INPUT: PhotoArrayInput = {
		photoUris: DEFAULT_URIS,
		timestamp: DEFAULT_TIMESTAMP,
		processed: false,
		location: DEFAULT_LOCATION
	};

	beforeAll(async () => {
		await startContainer();
		client = getTestClient();
	});

	afterAll(async () => {
		await stopContainer();
	});

	afterEach(async () => {
		await teardownTestTable();
	});

	beforeEach(async () => {
		await setupTestTable();
		service = new PhotoGalleryService(client, TEST_TABLE);
	});

	describe('Basic CRUD Operations', () => {
		it('should create and retrieve an item', async () => {
			const input = DEFAULT_INPUT;

			const created = await service.createItem(TEST_PARTITION_KEY, input);
			expect(created.photoGalleryId).toBe(TEST_PARTITION_KEY);
			expect(created.photoArrayId).toBeDefined();
			expect(created.photoUris).toEqual(input.photoUris);
			expect(created.timestamp).toBe(input.timestamp);
			expect(created.processed).toBe(false);
			expect(created.location).toBe(input.location);

			const retrieved = await service.getItem(TEST_PARTITION_KEY, created.photoArrayId);
			expect(retrieved).toEqual(created);
		});

		it('should update non-key attributes', async () => {
			const input = DEFAULT_INPUT;
			const created = await service.createItem(TEST_PARTITION_KEY, input);

			const updated = await service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {
				processed: true,
				location: 'Birmingham, UK'
			});
			expect(updated.processed).toBe(true);
			expect(updated.location).toBe('Birmingham, UK');
			expect(updated.photoUris).toEqual(input.photoUris);
		});

		it('should throw validation error when no updates provided', async () => {
			const input = DEFAULT_INPUT;
			const created = await service.createItem(TEST_PARTITION_KEY, input);

			await expect(
				service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {})
			).rejects.toBeInstanceOf(PhotoArrayValidationError);
		});

		it('should delete an item', async () => {
			const input = DEFAULT_INPUT;
			const created = await service.createItem(TEST_PARTITION_KEY, input);

			await service.deleteItem(TEST_PARTITION_KEY, created.photoArrayId);
			await expect(
				service.getItem(TEST_PARTITION_KEY, created.photoArrayId)
			).rejects.toBeInstanceOf(PhotoArrayNotFoundError);
		});
	});

	describe('Fractional Indexing and Ordering', () => {
		it('should create items with keys that allow insertions before', async () => {
			const first = await service.createItem(TEST_PARTITION_KEY, DEFAULT_INPUT);
			const second = await service.createItem(
				TEST_PARTITION_KEY,
				DEFAULT_INPUT,
				first.photoArrayId
			);
			expect(second.photoArrayId < first.photoArrayId).toBe(true);
		});

		it('should maintain correct order when multiple items are created', async () => {
			const items: PhotoArray[] = [];
			for (let i = 0; i < 5; i++) {
				const input = { ...DEFAULT_INPUT, photoUris: new Set([`uri${i}`]) };

				const beforeRangeKey: string | undefined =
					items.length > 0 ? items[items.length - 1].photoArrayId : undefined;
				items.push(await service.createItem(TEST_PARTITION_KEY, input, beforeRangeKey));
			}

			const allItems = await service.getAllItems(TEST_PARTITION_KEY);
			expect(allItems.length).toBe(5);
			for (let i = 0; i < 4; i++) {
				expect(allItems[i].photoArrayId < allItems[i + 1].photoArrayId).toBe(true);
			}
		});

		it('should handle positioning with before and after keys', async () => {
			const item3 = await service.createItem(TEST_PARTITION_KEY, DEFAULT_INPUT);
			const item1 = await service.createItem(TEST_PARTITION_KEY, DEFAULT_INPUT, item3.photoArrayId);

			const item2 = await service.createItem(
				TEST_PARTITION_KEY,
				DEFAULT_INPUT,
				item3.photoArrayId,
				item1.photoArrayId
			);
			expect(item2.photoArrayId < item3.photoArrayId).toBe(true);
			expect(item2.photoArrayId > item1.photoArrayId).toBe(true);
		});
	});

	describe('Move Item Operations', () => {
		it('should move item to new position', async () => {
			const item3 = await service.createItem(TEST_PARTITION_KEY, {
				...DEFAULT_INPUT,
				location: '3'
			});
			const item2 = await service.createItem(
				TEST_PARTITION_KEY,
				{ ...DEFAULT_INPUT, location: '2' },
				item3.photoArrayId
			);
			const item1 = await service.createItem(
				TEST_PARTITION_KEY,
				{ ...DEFAULT_INPUT, location: '1' },
				item2.photoArrayId
			);

			let movedItem = await service.moveItem(
				TEST_PARTITION_KEY,
				item3.photoArrayId,
				item2.photoArrayId,
				item1.photoArrayId
			);
			expect(movedItem.location == '3').toBe(true);
			expect(movedItem.photoArrayId < item2.photoArrayId).toBe(true);
			expect(movedItem.photoArrayId > item1.photoArrayId).toBe(true);
			await expect(service.getItem(TEST_PARTITION_KEY, item3.photoArrayId)).rejects.toBeInstanceOf(
				PhotoArrayNotFoundError
			);
			expect(
				(await service.getAllItems(TEST_PARTITION_KEY)).map((photoArray: PhotoArray) => {
					return photoArray.location;
				})
			).toEqual(['1', '3', '2']);

			movedItem = await service.moveItem(
				TEST_PARTITION_KEY,
				movedItem.photoArrayId,
				item1.photoArrayId
			);
			expect(movedItem.location == '3').toBe(true);
			expect(movedItem.photoArrayId < item1.photoArrayId).toBe(true);
			expect(
				(await service.getAllItems(TEST_PARTITION_KEY)).map((photoArray: PhotoArray) => {
					return photoArray.location;
				})
			).toEqual(['3', '1', '2']);

			movedItem = await service.moveItem(
				TEST_PARTITION_KEY,
				movedItem.photoArrayId,
				undefined,
				item2.photoArrayId
			);
			expect(movedItem.location == '3').toBe(true);
			expect(movedItem.photoArrayId > item2.photoArrayId).toBe(true);
			expect(
				(await service.getAllItems(TEST_PARTITION_KEY)).map((photoArray: PhotoArray) => {
					return photoArray.location;
				})
			).toEqual(['1', '2', '3']);
		});

		it('should throw error when moving non-existent item', async () => {
			await expect(service.moveItem(TEST_PARTITION_KEY, 'non-existent-key')).rejects.toBeInstanceOf(
				PhotoArrayNotFoundError
			);
		});
	});
});
