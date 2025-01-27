import logging
import aurora_data_api
import os
from urllib.parse import unquote_plus

import boto3
import json
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

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

def get_s3_object(bucket, key):
    s3 = boto3.client('s3')
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        return response['Body'].read().decode('utf-8')
    except (NoCredentialsError, PartialCredentialsError):
        raise Exception("Credentials not available")
    except Exception as e:
        raise Exception(f"An error occurred: {str(e)}")

def get_bank_holidays_json(bucket):
    key = "bank-holidays.json"
    body = get_s3_object(bucket, key)
    
    if not body:
        raise Exception("No data found in bank-holidays.json")

    return json.loads(body)

def main(event, context):
    bucket = event["Records"][0]["s3"]["bucket"]["name"]
    key = unquote_plus(event["Records"][0]["s3"]["object"]["key"], encoding="utf-8")
    file_path = "/tmp/" + key.split("/")[-1]

    try:
        bank_holidays_bucket_name = os.getenv('BANK_HOLIDAYS_BUCKET_NAME')    
        if not bank_holidays_bucket_name:
            raise Exception("Missing env vars - BANK_HOLIDAYS_BUCKET_NAME must be set")
        logger.info("Retrieving bank holidays JSON");
        bank_holidays_json = get_bank_holidays_json(bank_holidays_bucket_name);
        download_from_s3_and_write_to_db(
            s3_client, cloudwatch_client, bucket, key, file_path, db_connection, logger, bank_holidays_json
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
