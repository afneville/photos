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


def generate_thumbnail_coordinates():
    """Generate realistic thumbnail coordinates for various crop scenarios"""
    coords_options = [
        {"x": 504, "y": 0, "w": 3072, "h": 3072},
        {"x": 0, "y": 0, "w": 1500, "h": 1500},
        {"x": 2580, "y": 1572, "w": 1500, "h": 1500},
        {"x": 1540, "y": 0, "w": 1000, "h": 3072},
        {"x": 0, "y": 1036, "w": 4080, "h": 1000},
    ]

    num_coords = random.randint(1, 3)
    return random.sample(coords_options, num_coords)


def generate_photo_uris(thumbnail_coords):
    return [f"{uuid.uuid4()}" for _ in range(len(thumbnail_coords))]


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

    for i in range(num_entries):
        key = generate_key_between(prev_key, None)
        keys.append(key)
        prev_key = key

    for i, photo_array_id in enumerate(keys):
        # Create predictable first item to match our test photo
        if i == 0:
            thumbnail_coords = [{"x": 504, "y": 0, "w": 3072, "h": 3072}]
            photo_uris = ["9d79417f-6c92-4884-b293-ee6098eb8fda"]
        else:
            thumbnail_coords = generate_thumbnail_coordinates()
            photo_uris = generate_photo_uris(thumbnail_coords)
            
        item = {
            "photoGalleryId": PARTITION_KEY,
            "photoArrayId": photo_array_id,
            "photoUris": photo_uris,
            "timestamp": generate_timestamp(),
            "processedCount": 0,
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
        nargs="?",
        default="populate",
        choices=["populate", "clear"],
        help="Action to perform: populate or clear the table (default: populate)",
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
