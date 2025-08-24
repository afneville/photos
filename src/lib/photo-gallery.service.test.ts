import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { setupTestTable, teardownTestTable, TEST_TABLE, TEST_PARTITION_KEY } from './test-setup.js';
import type { PhotoArrayInput } from './types.js';
import { PhotoGalleryService, PhotoArrayNotFoundError, PhotoArrayValidationError } from './photo-gallery.service.js';

vi.mock('$env/dynamic/private', () => ({
  DYNAMODB_TABLE: TEST_TABLE,
  PARTITION_KEY: TEST_PARTITION_KEY,
  AWS_REGION: 'eu-west-2'
}));

describe('PhotoGalleryService', () => {
  let service: PhotoGalleryService;
  let client: DynamoDBDocumentClient;

  beforeAll(async () => {
    client = await setupTestTable();
  });

  afterAll(async () => {
    await teardownTestTable();
  });

  beforeEach(() => {
    service = new PhotoGalleryService(client, TEST_TABLE);
  });

  describe('Basic CRUD Operations', () => {
    it('should create and retrieve an item', async () => {
      const input: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']),
        timestamp: '2024-08-24T10:00:00.000Z',
        processed: false,
        location: 'Paris, France'
      };

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
      const input: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/photo3.jpg']),
        timestamp: '2024-08-24T11:00:00.000Z',
        processed: false,
        location: 'London, UK'
      };

      const created = await service.createItem(TEST_PARTITION_KEY, input);

      const updated = await service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {
        processed: true,
        location: 'Manchester, UK'
      });

      expect(updated.processed).toBe(true);
      expect(updated.location).toBe('Manchester, UK');
      expect(updated.photoUris).toEqual(input.photoUris);
    });

    it('should throw validation error when no updates provided', async () => {
      const input: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/photo5.jpg']),
        timestamp: '2024-08-24T13:00:00.000Z',
        processed: false,
        location: 'Test Location'
      };

      const created = await service.createItem(TEST_PARTITION_KEY, input);
      
      await expect(
        service.updateItem(TEST_PARTITION_KEY, created.photoArrayId, {})
      ).rejects.toBeInstanceOf(PhotoArrayValidationError);
    });

    it('should delete an item', async () => {
      const input: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/photo4.jpg']),
        timestamp: '2024-08-24T12:00:00.000Z',
        processed: false,
        location: 'Berlin, Germany'
      };

      const created = await service.createItem(TEST_PARTITION_KEY, input);
      await service.deleteItem(TEST_PARTITION_KEY, created.photoArrayId);

      await expect(
        service.getItem(TEST_PARTITION_KEY, created.photoArrayId)
      ).rejects.toBeInstanceOf(PhotoArrayNotFoundError);
    });
  });

  describe('Fractional Indexing and Ordering', () => {
    it('should create items with keys that allow insertions before', async () => {
      const input1: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/first.jpg']),
        timestamp: '2024-08-24T10:00:00.000Z',
        processed: false,
        location: 'First Location'
      };

      const input2: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/second.jpg']),
        timestamp: '2024-08-24T11:00:00.000Z',
        processed: false,
        location: 'Second Location'
      };

      const first = await service.createItem(TEST_PARTITION_KEY, input1);
      const second = await service.createItem(TEST_PARTITION_KEY, input2, first.photoArrayId);

      expect(second.photoArrayId < first.photoArrayId).toBe(true);
    });

    it('should maintain correct order when multiple items are created', async () => {
      const items = [];

      for (let i = 0; i < 5; i++) {
        const input: PhotoArrayInput = {
          photoUris: new Set([`https://example.com/photo${i}.jpg`]),
          timestamp: `2024-08-24T1${i}:00:00.000Z`,
          processed: false,
          location: `Location ${i}`
        };

        const beforeRangeKey = items.length > 0 ? items[items.length - 1].photoArrayId : undefined;
        items.push(await service.createItem(TEST_PARTITION_KEY, input, beforeRangeKey));
      }

      const allItems = await service.getAllItems(TEST_PARTITION_KEY);

      expect(allItems.length).toBe(5);
      for (let i = 0; i < 4; i++) {
        expect(allItems[i].photoArrayId < allItems[i + 1].photoArrayId).toBe(true);
      }
    });

    it('should handle positioning with before and after keys', async () => {
      const input1: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/pos1.jpg']),
        timestamp: '2024-08-24T10:00:00.000Z',
        processed: false,
        location: 'Position 1'
      };

      const input2: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/pos3.jpg']),
        timestamp: '2024-08-24T12:00:00.000Z',
        processed: false,
        location: 'Position 3'
      };

      const input3: PhotoArrayInput = {
        photoUris: new Set(['https://example.com/pos2.jpg']),
        timestamp: '2024-08-24T11:00:00.000Z',
        processed: false,
        location: 'Position 2'
      };

      const item1 = await service.createItem(TEST_PARTITION_KEY, input1);
      const item3 = await service.createItem(TEST_PARTITION_KEY, input3, item1.photoArrayId);

      // item3 < item1, so insert item2 between them: item3 < item2 < item1
      const item2 = await service.createItem(TEST_PARTITION_KEY, input2, item1.photoArrayId, item3.photoArrayId);

      expect(item3.photoArrayId < item2.photoArrayId).toBe(true);
      expect(item2.photoArrayId < item1.photoArrayId).toBe(true);
    });
  });

  describe('Move Item Operations', () => {
    it('should move item to new position', async () => {
      const inputs = [
        {
          photoUris: new Set(['https://example.com/move1.jpg']),
          timestamp: '2024-08-24T10:00:00.000Z',
          processed: false,
          location: 'Move Test 1'
        },
        {
          photoUris: new Set(['https://example.com/move2.jpg']),
          timestamp: '2024-08-24T11:00:00.000Z',
          processed: false,
          location: 'Move Test 2'
        },
        {
          photoUris: new Set(['https://example.com/move3.jpg']),
          timestamp: '2024-08-24T12:00:00.000Z',
          processed: false,
          location: 'Move Test 3'
        }
      ];

      const item1 = await service.createItem(TEST_PARTITION_KEY, inputs[0]);
      const item2 = await service.createItem(TEST_PARTITION_KEY, inputs[1], item1.photoArrayId);
      const item3 = await service.createItem(TEST_PARTITION_KEY, inputs[2], item2.photoArrayId);

      const movedItem = await service.moveItem(TEST_PARTITION_KEY, item1.photoArrayId, item3.photoArrayId);

      expect(movedItem.photoArrayId < item3.photoArrayId).toBe(true);
      expect(movedItem.location).toBe('Move Test 1');

      await expect(
        service.getItem(TEST_PARTITION_KEY, item1.photoArrayId)
      ).rejects.toBeInstanceOf(PhotoArrayNotFoundError);
    });

    it('should throw error when moving non-existent item', async () => {
      await expect(
        service.moveItem(TEST_PARTITION_KEY, 'non-existent-key')
      ).rejects.toBeInstanceOf(PhotoArrayNotFoundError);
    });
  });
});
