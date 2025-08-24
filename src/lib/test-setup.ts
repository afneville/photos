import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TEST_TABLE = 'test-photo-gallery';
export const TEST_PARTITION_KEY = 'test-gallery';

export async function setupTestTable(): Promise<DynamoDBDocumentClient> {
	const client = new DynamoDBClient({
		region: 'eu-west-2',
		endpoint: 'http://localhost:8000',
		credentials: {
			accessKeyId: 'fake',
			secretAccessKey: 'fake'
		}
	});

	// Create test table
	await client.send(
		new CreateTableCommand({
			TableName: TEST_TABLE,
			BillingMode: 'PAY_PER_REQUEST',
			AttributeDefinitions: [
				{ AttributeName: 'photoGalleryId', AttributeType: 'S' },
				{ AttributeName: 'photoArrayId', AttributeType: 'S' }
			],
			KeySchema: [
				{ AttributeName: 'photoGalleryId', KeyType: 'HASH' },
				{ AttributeName: 'photoArrayId', KeyType: 'RANGE' }
			]
		})
	);

	return DynamoDBDocumentClient.from(client);
}

export async function teardownTestTable(): Promise<void> {
	const client = new DynamoDBClient({
		region: 'eu-west-2',
		endpoint: 'http://localhost:8000',
		credentials: {
			accessKeyId: 'fake',
			secretAccessKey: 'fake'
		}
	});

	try {
		await client.send(
			new DeleteTableCommand({
				TableName: TEST_TABLE
			})
		);
	} catch (error) {
		// catch error if table does not exist
	}
}
