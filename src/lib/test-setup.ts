import {
	DynamoDBClient,
	CreateTableCommand,
	DeleteTableCommand,
	ListTablesCommand
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Docker from 'dockerode';

export const TEST_DYNAMODB_TABLE = 'test-photo-gallery';
export const TEST_STAGING_BUCKET = 'test-staging-bucket';
export const TEST_PARTITION_KEY = 'test-gallery';
export const TEST_AWS_REGION = 'eu-west-2';

const docker = new Docker();
let container: any;
let testDynamoDbDocClient: DynamoDBDocumentClient | null = null;

export function getTestDynamoDbDocClient(): DynamoDBDocumentClient {
	if (!testDynamoDbDocClient) {
		const client = new DynamoDBClient({
			region: 'eu-west-2',
			endpoint: 'http://localhost:8000',
			credentials: {
				accessKeyId: 'fake',
				secretAccessKey: 'fake'
			}
		});
		testDynamoDbDocClient = DynamoDBDocumentClient.from(client);
	}
	return testDynamoDbDocClient;
}


async function waitForDynamoDB(maxAttempts = 30, intervalMs = 100) {
	const client = getTestDynamoDbDocClient();
	for (let i = 0; i < maxAttempts; i++) {
		try {
			await client.send(new ListTablesCommand({}));
			return;
		} catch (error) {
			if (i === maxAttempts - 1) throw error;
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}
}

export async function startContainer() {
	container = await docker.createContainer({
		Image: 'amazon/dynamodb-local:latest',
		Cmd: ['-jar', 'DynamoDBLocal.jar', '-inMemory', '-sharedDb'],
		HostConfig: {
			PortBindings: { '8000/tcp': [{ HostPort: '8000' }] },
			AutoRemove: true
		}
	});

	await container.start();
	await waitForDynamoDB();
}

export async function stopContainer() {
	if (container) {
		try {
			await container.kill();
		} catch (error) {
			// continue on error
		}
		container = null;
	}
}

export async function setupTestTable(): Promise<void> {
	const dynamoDbDocClient = getTestDynamoDbDocClient();

	await dynamoDbDocClient.send(
		new CreateTableCommand({
			TableName: TEST_DYNAMODB_TABLE,
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
}

export async function teardownTestTable(): Promise<void> {
	const dynamoDbDocClient = getTestDynamoDbDocClient();

	try {
		await dynamoDbDocClient.send(
			new DeleteTableCommand({
				TableName: TEST_DYNAMODB_TABLE
			})
		);
	} catch (error) {}
}
