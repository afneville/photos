#!/usr/bin/env python3

import argparse
import uuid
from datetime import datetime, timezone, timedelta
import random
import boto3
from fractional_indexing import generate_key_between
import sys

TABLE_NAME = "PhotoGallery-test"
PARTITION_KEY = "test-gallery"

LOCATIONS = [
    "Dublin, Ireland",
    "London, UK",
    "Paris, France",
    "Berlin, Germany",
    "Rome, Italy",
    "Madrid, Spain",
    "Amsterdam, Netherlands",
    "Copenhagen, Denmark",
    "Stockholm, Sweden",
    "Oslo, Norway",
    "Helsinki, Finland",
    "Vienna, Austria",
    "Prague, Czech Republic",
    "Warsaw, Poland",
    "Budapest, Hungary",
    "Zurich, Switzerland",
]


def get_dynamodb_client():
    return boto3.client("dynamodb", region_name="eu-west-2")


def get_dynamodb_resource():
    return boto3.resource("dynamodb", region_name="eu-west-2")


def generate_photo_uris(count=4):
    return [f"{uuid.uuid4()}" for _ in range(count)]


def generate_timestamp():
    now = datetime.now(timezone.utc)
    days_ago = random.randint(1, 365)
    random_date = now.replace(day=1) - timedelta(days=days_ago)
    return random_date.isoformat()


def populate_table(num_entries=20):
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(TABLE_NAME)

    keys = []
    prev_key = None

    for _ in range(num_entries):
        key = generate_key_between(prev_key, None)
        keys.append(key)
        prev_key = key

    for _, photo_array_id in enumerate(keys):
        num_uris = random.randint(2, 6)
        item = {
            "photoGalleryId": PARTITION_KEY,
            "photoArrayId": photo_array_id,
            "photoUris": generate_photo_uris(num_uris),
            "timestamp": generate_timestamp(),
            "processed": random.choice([True, False]),
            "location": random.choice(LOCATIONS),
        }
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
        choices=["populate", "clear"],
        help="Action to perform: populate or clear the table",
    )
    parser.add_argument(
        "-n",
        "--num-entries",
        type=int,
        default=20,
        help="Number of entries to populate (default: 20)",
    )

    args = parser.parse_args()

    if not check_table_exists():
        sys.exit(1)

    if args.action == "populate":
        populate_table(args.num_entries)
    elif args.action == "clear":
        clear_table()


if __name__ == "__main__":
    main()
