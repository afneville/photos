import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateKeyBetween } from 'fractional-indexing';
import { v4 as uuidv4 } from 'uuid';
import { env } from '$env/dynamic/private';
import type {
	PhotoArray,
	PhotoArrayInput,
	PhotoArrayUpdate,
	PhotoArrayCreationResponse
} from './types.js';

export class PhotoGalleryServiceError extends Error {
	constructor(
		message: string,
		public cause?: Error
	) {
		super(message);
		this.name = 'PhotoGalleryServiceError';
	}
}

export class PhotoArrayNotFoundError extends PhotoGalleryServiceError {
	constructor(photoArrayId: string, cause?: Error) {
		super(`Photo array with ID ${photoArrayId} not found`, cause);
		this.name = 'PhotoGalleryItemNotFoundError';
	}
}

export class PhotoArrayValidationError extends PhotoGalleryServiceError {
	constructor(message: string, cause?: Error) {
		super(`Validation error: ${message}`, cause);
		this.name = 'PhotoGalleryValidationError';
	}
}

export class PhotoGalleryService {
	private readonly dynamoDbDocClient: DynamoDBDocumentClient;
	private readonly s3Client: S3Client;
	private readonly tableName: string;
	private readonly stagingBucketName: string;

	constructor(
		dynamoDbDocClient?: DynamoDBDocumentClient,
		s3Client?: S3Client,
		tableName?: string,
		stagingBucketName?: string
	) {
		if (!env.CLOUD_REGION) {
			throw new Error('CLOUD_REGION environment variable must be set');
		}
		if (!env.DYNAMODB_TABLE && !tableName) {
			throw new Error('DYNAMODB_TABLE environment variable or tableName paramater required');
		}
		if (!env.STAGING_BUCKET && !stagingBucketName) {
			throw new Error(
				'STAGING_BUCKET environment variable or stagingBucketName paramater required'
			);
		}
		this.tableName = tableName ? tableName : env.DYNAMODB_TABLE!;
		this.stagingBucketName = stagingBucketName ? stagingBucketName : env.STAGING_BUCKET!;

		this.s3Client = s3Client ? s3Client : new S3Client({ region: env.CLOUD_REGION });
		this.dynamoDbDocClient = dynamoDbDocClient
			? dynamoDbDocClient
			: DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.CLOUD_REGION }));
	}

	async createItem(
		photoGalleryId: string,
		inputItem: PhotoArrayInput,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArrayCreationResponse> {
		try {
			const photoArrayId: string = generateKeyBetween(afterRangeKey, beforeRangeKey);

			const photoUris = new Set<string>();
			for (let i = 0; i < inputItem.thumbnailCoordinates.length; i++) {
				photoUris.add(uuidv4());
			}

			const item: PhotoArray = {
				photoGalleryId,
				photoArrayId,
				photoUris,
				timestamp: inputItem.timestamp,
				processedCount: 0,
				location: inputItem.location
			};

			await this.dynamoDbDocClient.send(
				new PutCommand({
					TableName: this.tableName,
					Item: item
				})
			);

			const presignedUrls: string[] = [];
			const photoUriArray = Array.from(photoUris);
			for (let i = 0; i < photoUriArray.length; i++) {
				const photoUri = photoUriArray[i];
				const coords = inputItem.thumbnailCoordinates[i];
				const command = new PutObjectCommand({
					Bucket: this.stagingBucketName,
					Key: `${photoGalleryId}/${photoArrayId}/${photoUri}/${coords.x}:${coords.y}:${coords.w}:${coords.h}`,
					ContentType: 'image/*'
				});
				const url = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
				presignedUrls.push(url);
			}

			return {
				photoArray: item,
				presignedUrls
			};
		} catch (error) {
			const err = error as Error;
			if (err.name === 'ValidationException') {
				throw new PhotoArrayValidationError(err.message || 'Validation failed', err);
			}
			throw new PhotoGalleryServiceError(`Failed to create photo array`, err);
		}
	}

	async getItem(photoGalleryId: string, photoArrayId: string): Promise<PhotoArray> {
		try {
			const response = await this.dynamoDbDocClient.send(
				new GetCommand({
					TableName: this.tableName,
					Key: {
						photoGalleryId,
						photoArrayId
					}
				})
			);

			if (!response.Item) {
				throw new PhotoArrayNotFoundError(photoArrayId);
			}

			const item = response.Item as PhotoArray;

			if (
				!item.photoGalleryId ||
				!item.photoArrayId ||
				!item.photoUris ||
				!item.timestamp ||
				item.processedCount === undefined ||
				!item.location
			) {
				throw new PhotoGalleryServiceError(`Invalid photo array item for ${photoArrayId}`);
			}

			return item;
		} catch (error) {
			const err = error as Error;
			if (err instanceof PhotoArrayNotFoundError || err instanceof PhotoGalleryServiceError) {
				throw err;
			}
			throw new PhotoGalleryServiceError(`Failed to get photo array ${photoArrayId}`, err);
		}
	}

	async updateItem(
		photoGalleryId: string,
		photoArrayId: string,
		updates: PhotoArrayUpdate
	): Promise<PhotoArray> {
		try {
			const updateExpressions: string[] = [];
			const expressionAttributeNames: Record<string, string> = {};
			const expressionAttributeValues: Record<string, unknown> = {};

			if (updates.photoUris !== undefined) {
				updateExpressions.push('#photoUris = :photoUris');
				expressionAttributeNames['#photoUris'] = 'photoUris';
				expressionAttributeValues[':photoUris'] = updates.photoUris;
			}

			if (updates.processedCount !== undefined) {
				updateExpressions.push('#processedCount = :processedCount');
				expressionAttributeNames['#processedCount'] = 'processedCount';
				expressionAttributeValues[':processedCount'] = updates.processedCount;
			}

			if (updates.location !== undefined) {
				updateExpressions.push('#location = :location');
				expressionAttributeNames['#location'] = 'location';
				expressionAttributeValues[':location'] = updates.location;
			}

			if (updateExpressions.length === 0) {
				throw new PhotoArrayValidationError('No updates provided');
			}

			const response = await this.dynamoDbDocClient.send(
				new UpdateCommand({
					TableName: this.tableName,
					Key: {
						photoGalleryId,
						photoArrayId
					},
					UpdateExpression: `SET ${updateExpressions.join(', ')}`,
					ExpressionAttributeNames: expressionAttributeNames,
					ExpressionAttributeValues: expressionAttributeValues,
					ReturnValues: 'ALL_NEW'
				})
			);

			return response.Attributes as PhotoArray;
		} catch (error) {
			const err = error as Error;
			if (err instanceof PhotoArrayValidationError) {
				throw err;
			}
			if (err.name === 'ValidationException') {
				throw new PhotoArrayValidationError(err.message || 'Update validation failed', err);
			}
			if (err.name === 'ConditionalCheckFailedException') {
				throw new PhotoArrayNotFoundError(photoArrayId, err);
			}
			throw new PhotoGalleryServiceError(`Failed to update photo array ${photoArrayId}`, err);
		}
	}

	async deleteItem(photoGalleryId: string, photoArrayId: string): Promise<void> {
		try {
			await this.dynamoDbDocClient.send(
				new DeleteCommand({
					TableName: this.tableName,
					Key: {
						photoGalleryId,
						photoArrayId
					}
				})
			);
		} catch (error) {
			const err = error as Error;
			throw new PhotoGalleryServiceError(`Failed to delete photo array ${photoArrayId}`, err);
		}
	}

	async getAllItems(photoGalleryId: string): Promise<PhotoArray[]> {
		try {
			const response = await this.dynamoDbDocClient.send(
				new QueryCommand({
					TableName: this.tableName,
					KeyConditionExpression: '#photoGalleryId = :photoGalleryId',
					ExpressionAttributeNames: {
						'#photoGalleryId': 'photoGalleryId'
					},
					ExpressionAttributeValues: {
						':photoGalleryId': photoGalleryId
					}
				})
			);

			return (response.Items || []) as PhotoArray[];
		} catch (error) {
			const err = error as Error;
			throw new PhotoGalleryServiceError(
				`Failed to get all items for gallery ${photoGalleryId}`,
				err
			);
		}
	}

	async moveItem(
		photoGalleryId: string,
		photoArrayId: string,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArray> {
		try {
			const currentItem = await this.getItem(photoGalleryId, photoArrayId);

			const newPhotoArrayId = generateKeyBetween(afterRangeKey, beforeRangeKey);

			const newItem: PhotoArray = {
				...currentItem,
				photoArrayId: newPhotoArrayId
			};

			await this.dynamoDbDocClient.send(
				new TransactWriteCommand({
					TransactItems: [
						{
							Delete: {
								TableName: this.tableName,
								Key: {
									photoGalleryId,
									photoArrayId
								}
							}
						},
						{
							Put: {
								TableName: this.tableName,
								Item: newItem
							}
						}
					]
				})
			);

			return newItem;
		} catch (error) {
			const err = error as Error;
			if (err instanceof PhotoArrayNotFoundError) {
				throw err;
			}
			if (err.name === 'TransactionCanceledException') {
				throw new PhotoGalleryServiceError(
					`Transaction failed while moving photo array ${photoArrayId}`,
					err
				);
			}
			if (err.name === 'ValidationException') {
				throw new PhotoArrayValidationError(err.message || 'Move validation failed', err);
			}
			throw new PhotoGalleryServiceError(`Failed to move photo array ${photoArrayId}`, err);
		}
	}
}
