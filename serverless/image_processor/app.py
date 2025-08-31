import json
import boto3
from PIL import Image
from io import BytesIO
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client("s3")


def lambda_handler(event, context):
    try:
        for record in event["Records"]:
            bucket_name = record["s3"]["bucket"]["name"]
            object_key = record["s3"]["object"]["key"]

            logger.info(f"Processing image: {object_key} from bucket: {bucket_name}")

            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            image_data = response["Body"].read()

            with Image.open(BytesIO(image_data)) as img:
                width, height = img.size
                format_type = img.format
                mode = img.mode

                logger.info(
                    f"Image info - Size: {width}x{height}, Format: {format_type}, Mode: {mode}"
                )

                # # Example: Create a thumbnail
                # thumbnail = img.copy()
                # thumbnail.thumbnail((200, 200), Image.Resampling.LANCZOS)
                #
                # # Save thumbnail back to S3
                # thumb_buffer = BytesIO()
                # thumbnail.save(
                #     thumb_buffer, format=format_type if format_type else "JPEG"
                # )
                # thumb_buffer.seek(0)
                #
                # thumb_key = f"thumbnails/{object_key}"
                # s3_client.put_object(
                #     Bucket=bucket_name,
                #     Key=thumb_key,
                #     Body=thumb_buffer.getvalue(),
                #     ContentType=f"image/{format_type.lower() if format_type else 'jpeg'}",
                # )
                #
                # logger.info(f"Created thumbnail: {thumb_key}")

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Images processed successfully"}),
        }

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise e
