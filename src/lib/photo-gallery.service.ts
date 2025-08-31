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
import { generateKeyBetween } from 'fractional-indexing';
import { DYNAMODB_TABLE, AWS_REGION } from '$env/dynamic/private';
import type { PhotoArray, PhotoArrayInput, PhotoArrayUpdate } from './types.js';

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
	private readonly client: DynamoDBDocumentClient;
	private readonly tableName: string;

	constructor(client?: DynamoDBDocumentClient, tableName?: string) {
		if (client && tableName) {
			this.client = client;
			this.tableName = tableName;
		} else {
			const dynamoClient = new DynamoDBClient({
				region: AWS_REGION || 'eu-west-2'
			});

			if (!DYNAMODB_TABLE) {
				throw new Error('DYNAMODB_TABLE environment variable is required');
			}

			this.client = DynamoDBDocumentClient.from(dynamoClient);
			this.tableName = DYNAMODB_TABLE;
		}
	}

	async createItem(
		photoGalleryId: string,
		inputItem: PhotoArrayInput,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArray> {
		try {
			let photoArrayId: string = generateKeyBetween(afterRangeKey, beforeRangeKey);
			const item: PhotoArray = {
				photoGalleryId,
				photoArrayId,
				...inputItem
			};

			await this.client.send(
				new PutCommand({
					TableName: this.tableName,
					Item: item
				})
			);

			return item;
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
			const response = await this.client.send(
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
				item.processed === undefined ||
				!item.location
			) {
				throw new PhotoGalleryServiceError(
					`Invalid photo array item for ${photoArrayId}`
				);
			}

			return item;
		} catch (error) {
			const err = error as Error;
			if (err instanceof PhotoArrayNotFoundError || err instanceof PhotoGalleryServiceError) {
				throw err;
			}
			throw new PhotoGalleryServiceError(
				`Failed to get photo array ${photoArrayId}`,
				err
			);
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
			const expressionAttributeValues: Record<string, any> = {};

			if (updates.photoUris !== undefined) {
				updateExpressions.push('#photoUris = :photoUris');
				expressionAttributeNames['#photoUris'] = 'photoUris';
				expressionAttributeValues[':photoUris'] = updates.photoUris;
			}

			if (updates.processed !== undefined) {
				updateExpressions.push('#processed = :processed');
				expressionAttributeNames['#processed'] = 'processed';
				expressionAttributeValues[':processed'] = updates.processed;
			}

			if (updates.location !== undefined) {
				updateExpressions.push('#location = :location');
				expressionAttributeNames['#location'] = 'location';
				expressionAttributeValues[':location'] = updates.location;
			}


			if (updateExpressions.length === 0) {
				throw new PhotoArrayValidationError('No updates provided');
			}

			const response = await this.client.send(
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
			throw new PhotoGalleryServiceError(
				`Failed to update photo array ${photoArrayId}`,
				err
			);
		}
	}

	async deleteItem(photoGalleryId: string, photoArrayId: string): Promise<void> {
		try {
			await this.client.send(
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
			throw new PhotoGalleryServiceError(
				`Failed to delete photo array ${photoArrayId}`,
				err
			);
		}
	}

	async getAllItems(photoGalleryId: string): Promise<PhotoArray[]> {
		try {
			const response = await this.client.send(
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

			await this.client.send(
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
			throw new PhotoGalleryServiceError(
				`Failed to move photo array ${photoArrayId}`,
				err
			);
		}
	}
}
