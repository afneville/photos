#!/usr/bin/env python3

import argparse
import boto3
import sys

TABLE_NAME = "PhotoGallery-test"
PARTITION_KEY = "test-gallery"


def get_dynamodb_client():
    return boto3.client("dynamodb", region_name="eu-west-2")


def get_dynamodb_resource():
    return boto3.resource("dynamodb", region_name="eu-west-2")


def populate_table():
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(TABLE_NAME)

    test_items = [
        {
            "photoGalleryId": PARTITION_KEY,
            "photoArrayId": "a0",
            "photoUris": ["9d79417f-6c92-4884-b293-ee6098eb8fda"],
            "timestamp": "2024-08-24T10:00:00.000Z",
            "processedCount": 0,
            "location": "Dublin, Ireland",
        },
        {
            "photoGalleryId": PARTITION_KEY,
            "photoArrayId": "a1",
            "photoUris": [
                "12345678-1234-5678-9abc-123456789012",
                "12345678-1234-5678-9abc-123456789013",
                "12345678-1234-5678-9abc-123456789014",
            ],
            "timestamp": "2024-08-25T14:30:00.000Z",
            "processedCount": 0,
            "location": "London, UK",
        },
        {
            "photoGalleryId": PARTITION_KEY,
            "photoArrayId": "a2",
            "photoUris": [
                "87654321-4321-8765-dcba-987654321098",
                "87654321-4321-8765-dcba-987654321099",
            ],
            "timestamp": "2024-08-26T09:15:00.000Z",
            "processedCount": 0,
            "location": "Birmingham, UK",
        },
    ]

    for item in test_items:
        table.put_item(Item=item)


def clear_table():
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(TABLE_NAME)

    response = table.scan()
    items = response["Items"]

    if not items:
        return

    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={
                    "photoGalleryId": item["photoGalleryId"],
                    "photoArrayId": item["photoArrayId"],
                }
            )


def check_table_exists():
    client = get_dynamodb_client()
    try:
        client.describe_table(TableName=TABLE_NAME)
        return True
    except client.exceptions.ResourceNotFoundException:
        return False
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Populate or clear the test DynamoDB table"
    )
    parser.add_argument(
        "action",
        nargs="?",
        default="populate",
        choices=["populate", "clear"],
        help="Action to perform: populate or clear the table (default: populate)",
    )

    args = parser.parse_args()

    if not check_table_exists():
        sys.exit(1)

    if args.action == "populate":
        populate_table()
    elif args.action == "clear":
        clear_table()


if __name__ == "__main__":
    main()
