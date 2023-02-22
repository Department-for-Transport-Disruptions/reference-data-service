import logging
import aurora_data_api
import os
from urllib.parse import unquote_plus

import boto3

from txc_processor import download_from_s3_and_write_to_db

s3_client = boto3.client("s3")
cloudwatch_client = boto3.client("cloudwatch")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

db_connection = aurora_data_api.connect(
    aurora_cluster_arn=os.getenv("CLUSTER_ARN"),
    database=os.getenv("DATABASE_NAME"),
    secret_arn=os.getenv("DATABASE_SECRET_ARN")
)


def main(event, context):
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = unquote_plus(event["Records"][0]["s3"]["object"]["key"], encoding="utf-8")
    file_path = "/tmp/" + key.split("/")[-1]

    try:
        download_from_s3_and_write_to_db(
            s3_client, cloudwatch_client, bucket, key, file_path, db_connection, logger
        )
    except Exception as e:
        logger.error(
            f"ERROR! Failed to write contents of 's3://{bucket}/{key}' to database, error: {e}"
        )
        raise e
    finally:
        if os.path.exists(file_path):
            logger.info(f"Removing File: {file_path}")
            os.remove(file_path)
        else:
            logger.warn(f"File does not exist: {file_path}")
