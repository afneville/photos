from PIL import Image
from io import BytesIO
import logging
import os
import boto3
import urllib.parse
import json
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")
dynamodb_resource = boto3.resource("dynamodb")


def parse_s3_key(key):
    try:
        parts = key.split("/")
        if len(parts) != 4:
            return None

        photo_gallery_id, photo_array_id, photo_uri, coords_str = parts

        coord_parts = coords_str.split(":")
        if len(coord_parts) != 4:
            return None

        x, y, w, h = map(int, coord_parts)

        return {
            "photo_gallery_id": photo_gallery_id,
            "photo_array_id": photo_array_id,
            "photo_uri": photo_uri,
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "coords_str": coords_str,
        }
    except (ValueError, IndexError) as e:
        logger.error(f"Failed to parse S3 key '{key}': {str(e)}")
        return None


def increment_processed_count(photo_gallery_id, photo_array_id):
    try:
        table_name = os.environ.get("DYNAMODB_TABLE_NAME")
        if not table_name:
            logger.error("DYNAMODB_TABLE_NAME environment variable not set")
            return False

        table = dynamodb_resource.Table(table_name)

        response = table.update_item(
            Key={
                "photoGalleryId": photo_gallery_id,
                "photoArrayId": photo_array_id
            },
            UpdateExpression="ADD processedCount :increment",
            ExpressionAttributeValues={":increment": 1},
            ReturnValues="UPDATED_NEW"
        )

        new_count = response.get("Attributes", {}).get("processedCount", 0)
        logger.info(
            f"Incremented processedCount to {new_count} for {photo_gallery_id}/{photo_array_id}"
        )
        return True

    except ClientError as e:
        logger.error(
            f"Failed to increment processedCount for {photo_gallery_id}/{photo_array_id}: {str(e)}"
        )
        return False
    except Exception as e:
        logger.error(f"Unexpected error incrementing processedCount: {str(e)}")
        return False


def strip_exif_metadata(img):
    if img.mode in ("RGBA", "LA", "P"):
        clean_img = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        clean_img.paste(
            img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None
        )
        return clean_img
    else:
        data = list(img.getdata())
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(data)
        return clean_img


def crop_and_resize(img, target_size, crop_box=None):
    if crop_box:
        img = img.crop(crop_box)

    current_width, current_height = img.size
    if current_width >= current_height:
        target_width = target_size
        target_height = int(target_size * current_height / current_width)
    else:
        target_height = target_size
        target_width = int(target_size * current_width / current_height)

    return img.resize((target_width, target_height), Image.Resampling.LANCZOS)


def process_image(image_data, parsed_key):
    try:
        with Image.open(BytesIO(image_data)) as img:
            img.verify()

        with Image.open(BytesIO(image_data)) as img:
            width, height = img.size
            format_type = img.format

            logger.info(
                f"Original image - Size: {width}x{height}, Format: {format_type}"
            )

            if format_type not in ["JPEG", "JPG", "PNG", "WEBP", "MPO"]:
                logger.error(f"Unsupported image format: {format_type}")
                return None

            # Convert MPO to JPEG (use first frame for 3D images)
            if format_type == "MPO":
                logger.info("Converting MPO to JPEG format")
                img = img.convert("RGB")
                format_type = "JPEG"

            clean_img = strip_exif_metadata(img)

            x, y, w, h = (
                parsed_key["x"],
                parsed_key["y"],
                parsed_key["w"],
                parsed_key["h"],
            )
            crop_box = (x, y, x + w, y + h)

            if x + w > width or y + h > height or x < 0 or y < 0:
                logger.error(
                    f"Invalid crop coordinates: {crop_box} for image {width}x{height}"
                )
                return None

            logger.info(f"Cropping to: {crop_box}")

            sizes = {
                "thumbnail": 300,
                "medium": 1024,
                "hd": 1920,
                "qhd": 2560,
            }

            processed_images = {}

            for size_name, target_size in sizes.items():
                try:
                    if size_name == "thumbnail":
                        processed_img = crop_and_resize(
                            clean_img.copy(), target_size, crop_box
                        )
                    else:
                        processed_img = crop_and_resize(
                            clean_img.copy(), target_size, None
                        )

                    buffer = BytesIO()
                    processed_img.save(
                        buffer,
                        format="JPEG",
                        quality=85,
                        optimize=True,
                        progressive=True,
                    )
                    buffer.seek(0)

                    processed_images[size_name] = buffer
                    logger.info(
                        f"Created {size_name}: {processed_img.width}x{processed_img.height}"
                    )

                except Exception as e:
                    logger.error(f"Failed to create {size_name}: {str(e)}")
                    continue

            try:
                # Original: just strip EXIF, no cropping
                buffer = BytesIO()
                clean_img.save(
                    buffer, format="JPEG", quality=95, optimize=True, progressive=True
                )
                buffer.seek(0)
                processed_images["original"] = buffer
                logger.info(f"Created original: {clean_img.width}x{clean_img.height}")
            except Exception as e:
                logger.error(f"Failed to create original: {str(e)}")

            return processed_images

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return None


def lambda_handler(event, context):
    try:
        for record in event["Records"]:
            bucket_name = record["s3"]["bucket"]["name"]
            object_key = record["s3"]["object"]["key"]

            decoded_key = urllib.parse.unquote(object_key)

            logger.info(f"Processing image: {decoded_key} from bucket: {bucket_name}")

            parsed_key = parse_s3_key(decoded_key)
            if not parsed_key:
                logger.error(f"Invalid S3 key format: {decoded_key}")
                continue

            logger.info(
                f"Parsed key - Gallery: {parsed_key['photo_gallery_id']}, "
                f"Array: {parsed_key['photo_array_id']}, "
                f"UUID: {parsed_key['photo_uri']}, "
                f"Coords: {parsed_key['x']}:{parsed_key['y']}:{parsed_key['w']}:{parsed_key['h']}"
            )

            response = s3_client.get_object(Bucket=bucket_name, Key=decoded_key)
            image_data = response["Body"].read()

            serving_bucket = os.environ.get("SERVING_BUCKET")
            if not serving_bucket:
                logger.error("SERVING_BUCKET environment variable not set")
                continue

            processed_images = process_image(image_data, parsed_key)
            if not processed_images:
                logger.error(f"Failed to process image: {decoded_key}")
                continue

            all_uploads_successful = True
            uploaded_files = []

            for size_name, image_buffer in processed_images.items():
                processed_key = f"photos/{parsed_key['photo_uri']}/{size_name}"

                try:
                    s3_client.put_object(
                        Bucket=serving_bucket,
                        Key=processed_key,
                        Body=image_buffer.getvalue(),
                        ContentType="image/jpeg",
                    )
                    uploaded_files.append(processed_key)
                    logger.info(f"Saved {size_name}: {processed_key}")
                except Exception as e:
                    logger.error(
                        f"Failed to upload {size_name} ({processed_key}): {str(e)}"
                    )
                    all_uploads_successful = False
                    break

            if all_uploads_successful:
                increment_success = increment_processed_count(
                    parsed_key["photo_gallery_id"], parsed_key["photo_array_id"]
                )

                if increment_success:
                    logger.info(
                        f"Successfully processed and uploaded {len(processed_images)} versions of {decoded_key} and updated processedCount"
                    )
                else:
                    logger.warning(
                        f"Successfully processed and uploaded {len(processed_images)} versions of {decoded_key} but failed to update processedCount"
                    )
            else:
                logger.error(
                    f"Failed to upload all versions of {decoded_key}. processedCount not incremented. Uploaded files: {uploaded_files}"
                )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Images processed successfully"}),
        }

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise e
