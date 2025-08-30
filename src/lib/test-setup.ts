import {
	DynamoDBClient,
	CreateTableCommand,
	DeleteTableCommand,
	ListTablesCommand
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import Docker from 'dockerode';

export const TEST_TABLE = 'test-photo-gallery';
export const TEST_PARTITION_KEY = 'test-gallery';

const docker = new Docker();
let container: any;

async function waitForDynamoDB(maxAttempts = 30, intervalMs = 100) {
	const client = new DynamoDBClient({
		region: 'eu-west-2',
		endpoint: 'http://localhost:8000',
		credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
	});

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

let testClient: DynamoDBDocumentClient | null = null;

export function getTestClient(): DynamoDBDocumentClient {
	if (!testClient) {
		const client = new DynamoDBClient({
			region: 'eu-west-2',
			endpoint: 'http://localhost:8000',
			credentials: {
				accessKeyId: 'fake',
				secretAccessKey: 'fake'
			}
		});
		testClient = DynamoDBDocumentClient.from(client);
	}
	return testClient;
}

export async function setupTestTable(): Promise<void> {
	const client = getTestClient();

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
}

export async function teardownTestTable(): Promise<void> {
	const client = getTestClient();

	try {
		await client.send(
			new DeleteTableCommand({
				TableName: TEST_TABLE
			})
		);
	} catch (error) {
		// continue on error
	}
}
