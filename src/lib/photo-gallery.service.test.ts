import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
	vi,
	afterEach,
	type Mock
} from 'vitest';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	setupTestTable,
	teardownTestTable,
	getTestDynamoDbDocClient,
	startContainer,
	stopContainer,
	TEST_DYNAMODB_TABLE,
	TEST_PARTITION_KEY,
	TEST_STAGING_BUCKET,
	TEST_CLOUD_REGION
} from './test-setup.js';
import type { PhotoArray, PhotoArrayInput } from './types.js';
import {
	PhotoGalleryService,
	PhotoArrayNotFoundError,
	PhotoArrayValidationError
} from './photo-gallery.service.js';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DYNAMODB_TABLE: TEST_DYNAMODB_TABLE,
		STAGING_BUCKET: TEST_STAGING_BUCKET,
		PARTITION_KEY: TEST_PARTITION_KEY,
		CLOUD_REGION: TEST_CLOUD_REGION
	}
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: vi.fn()
}));

describe('PhotoGalleryService', () => {
	let service: PhotoGalleryService;
	let dynamoDbDocClient: DynamoDBDocumentClient;
	let s3Client: S3Client;

	const DEFAULT_TIMESTAMP = '2024-08-24T10:00:00.000Z';
	const DEFAULT_LOCATION = 'Dublin, Ireland';
	const DEFAULT_THUMBNAIL_COORDINATES = [
		{ x: 10, y: 20, w: 100, h: 150 },
		{ x: 50, y: 80, w: 200, h: 300 }
	];
	const DEFAULT_INPUT: PhotoArrayInput = {
		thumbnailCoordinates: DEFAULT_THUMBNAIL_COORDINATES,
		timestamp: DEFAULT_TIMESTAMP,
		location: DEFAULT_LOCATION
	};

	beforeAll(async () => {
		await startContainer();
		dynamoDbDocClient = getTestDynamoDbDocClient();
		s3Client = new S3Client({
			region: TEST_CLOUD_REGION,
			credentials: {
				accessKeyId: 'test',
				secretAccessKey: 'test'
			}
		});
	});

	afterAll(async () => {
		await stopContainer();
	});

	afterEach(async () => {
		await teardownTestTable();
		vi.clearAllMocks();
	});

	beforeEach(async () => {
		await setupTestTable();
		service = new PhotoGalleryService(dynamoDbDocClient, s3Client);
	});

	describe('Basic CRUD Operations', () => {
		it('should create and retrieve an item', async () => {
			const input = DEFAULT_INPUT;

			const response = await service.createItem(TEST_PARTITION_KEY, input);
			const created = response.photoArray;
			expect(created.photoGalleryId).toBe(TEST_PARTITION_KEY);
			expect(created.photoArrayId).toBeDefined();
			expect(created.photoUris.length).toBe(input.thumbnailCoordinates.length);
			expect(created.timestamp).toBe(input.timestamp);
			expect(created.processedCount).toBe(0);
			expect(created.location).toBe(input.location);
			expect(response.presignedUrls).toHaveLength(input.thumbnailCoordinates.length);

			const retrieved = await service.getItem(TEST_PARTITION_KEY, created.photoArrayId);
			expect(retrieved).toEqual(created);
		});

		it('should generate presigned URLs on create', async () => {
			const input = {
				...DEFAULT_INPUT,
				thumbnailCoordinates: [
					{ x: 10, y: 20, w: 100, h: 150 },
					{ x: 50, y: 80, w: 200, h: 300 },
					{ x: 75, y: 120, w: 150, h: 200 }
				]
			};
			const mockPresignedUrl = 'https://mock-url.com/test.jpg';
			(getSignedUrl as Mock).mockResolvedValue(mockPresignedUrl);

			const response = await service.createItem(TEST_PARTITION_KEY, input);

			expect(response.presignedUrls).toHaveLength(3);
			expect(response.presignedUrls.every((url) => url === mockPresignedUrl)).toBe(true);
			expect(getSignedUrl).toHaveBeenCalledTimes(3);

			const mockCalls = (getSignedUrl as Mock).mock.calls;
			mockCalls.forEach((call: unknown[], index: number) => {
				const putObjectCommand = call[1] as PutObjectCommand;
				const key = putObjectCommand.input.Key;
				const expectedCoords = input.thumbnailCoordinates[index];

				expect(key).toMatch(
					new RegExp(
						`^${TEST_PARTITION_KEY}/[^/]+/[0-9a-f-]{36}/${expectedCoords.x}:${expectedCoords.y}:${expectedCoords.w}:${expectedCoords.h}$`
					)
				);
			});
		});

		it('should update non-key attributes', async () => {
			const input = DEFAULT_INPUT;
			const response = await service.createItem(TEST_PARTITION_KEY, input);
			const created = response.photoArray;

			const updated = await service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {
				processedCount: 5,
				location: 'Birmingham, UK'
			});
			expect(updated.processedCount).toBe(5);
			expect(updated.location).toBe('Birmingham, UK');
			expect(updated.photoUris).toEqual(created.photoUris);
		});

		it('should throw validation error when no updates provided', async () => {
			const input = DEFAULT_INPUT;
			const response = await service.createItem(TEST_PARTITION_KEY, input);
			const created = response.photoArray;

			await expect(
				service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {})
			).rejects.toBeInstanceOf(PhotoArrayValidationError);
		});

		it('should delete an item', async () => {
			const input = DEFAULT_INPUT;
			const response = await service.createItem(TEST_PARTITION_KEY, input);
			const created = response.photoArray;

			await service.deleteItem(TEST_PARTITION_KEY, created.photoArrayId);
			await expect(
				service.getItem(TEST_PARTITION_KEY, created.photoArrayId)
			).rejects.toBeInstanceOf(PhotoArrayNotFoundError);
		});
	});

	describe('Fractional Indexing and Ordering', () => {
		it('should create items with keys that allow insertions before', async () => {
			const firstResponse = await service.createItem(TEST_PARTITION_KEY, DEFAULT_INPUT);
			const first = firstResponse.photoArray;
			const secondResponse = await service.createItem(
				TEST_PARTITION_KEY,
				DEFAULT_INPUT,
				first.photoArrayId
			);
			const second = secondResponse.photoArray;
			expect(second.photoArrayId < first.photoArrayId).toBe(true);
		});

		it('should maintain correct order when multiple items are created', async () => {
			const items: PhotoArray[] = [];
			for (let i = 0; i < 5; i++) {
				const input = DEFAULT_INPUT;

				const beforeRangeKey: string | undefined =
					items.length > 0 ? items[items.length - 1].photoArrayId : undefined;
				const response = await service.createItem(TEST_PARTITION_KEY, input, beforeRangeKey);
				items.push(response.photoArray);
			}

			const allItems = await service.getAllItems(TEST_PARTITION_KEY);
			expect(allItems.length).toBe(5);
			for (let i = 0; i < 4; i++) {
				expect(allItems[i].photoArrayId < allItems[i + 1].photoArrayId).toBe(true);
			}
		});

		it('should handle positioning with before and after keys', async () => {
			const response3 = await service.createItem(TEST_PARTITION_KEY, DEFAULT_INPUT);
			const item3 = response3.photoArray;
			const response1 = await service.createItem(
				TEST_PARTITION_KEY,
				DEFAULT_INPUT,
				item3.photoArrayId
			);
			const item1 = response1.photoArray;

			const response2 = await service.createItem(
				TEST_PARTITION_KEY,
				DEFAULT_INPUT,
				item3.photoArrayId,
				item1.photoArrayId
			);
			const item2 = response2.photoArray;
			expect(item2.photoArrayId < item3.photoArrayId).toBe(true);
			expect(item2.photoArrayId > item1.photoArrayId).toBe(true);
		});
	});

	describe('Move Item Operations', () => {
		it('should move item to new position', async () => {
			const response3 = await service.createItem(TEST_PARTITION_KEY, {
				...DEFAULT_INPUT,
				location: '3'
			});
			const item3 = response3.photoArray;
			const response2 = await service.createItem(
				TEST_PARTITION_KEY,
				{ ...DEFAULT_INPUT, location: '2' },
				item3.photoArrayId
			);
			const item2 = response2.photoArray;
			const response1 = await service.createItem(
				TEST_PARTITION_KEY,
				{ ...DEFAULT_INPUT, location: '1' },
				item2.photoArrayId
			);
			const item1 = response1.photoArray;

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
