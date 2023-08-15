from ftplib import FTP
from zipfile import ZipFile
from io import BytesIO
from urllib.request import urlopen
import json
import os
import logging
import time
import aurora_data_api
import boto3


logger = logging.getLogger()
logger.setLevel(logging.INFO)

FILE_DIR = "/tmp/"
s3 = boto3.resource("s3")
sm = boto3.client("secretsmanager")
cloudwatch = boto3.client("cloudwatch")
lambda_client = boto3.client("lambda")
ssm_client = boto3.client("ssm")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

FTP_CREDENTIALS = None

if os.getenv("FTP_CREDENTIALS_SECRET_ARN") is not None:
    ftp_credentials_response = sm.get_secret_value(
        SecretId=os.getenv("FTP_CREDENTIALS_SECRET_ARN")
    )
    FTP_CREDENTIALS = json.loads(ftp_credentials_response["SecretString"])

db_connection = aurora_data_api.connect(
    aurora_cluster_arn=os.getenv("CLUSTER_ARN"),
    database=os.getenv("DATABASE_NAME"),
    secret_arn=os.getenv("DATABASE_SECRET_ARN")
)

queries = [
    "SET FOREIGN_KEY_CHECKS=0",
    "DROP TABLE IF EXISTS service_journey_pattern_links_new",
    "CREATE TABLE service_journey_pattern_links_new LIKE service_journey_pattern_links",
    "DROP TABLE IF EXISTS service_journey_patterns_new",
    "CREATE TABLE service_journey_patterns_new LIKE service_journey_patterns",
    "DROP TABLE IF EXISTS service_admin_area_codes_new",
    "CREATE TABLE service_admin_area_codes_new LIKE service_admin_area_codes",
    "DROP TABLE IF EXISTS vehicle_journeys_new",
    "CREATE TABLE vehicle_journeys_new LIKE vehicle_journeys",
    "DROP TABLE IF EXISTS tracks_new",
    "CREATE TABLE tracks_new LIKE tracks",
    "DROP TABLE IF EXISTS services_new",
    "CREATE TABLE services_new LIKE services",
    "SET FOREIGN_KEY_CHECKS=1"
]


def wait_for_db():
    delay = 5
    max_attempts = 20

    attempt = 0
    while attempt < max_attempts:
        attempt += 1

        try:
            with db_connection.cursor() as cursor:
                cursor.execute('SELECT id FROM operators LIMIT 1')

            db_connection.commit()
            return
        except Exception as e:
            if e.__class__.__name__ == "BadRequestException" and "Communications link failure" in str(e):
                logger.info(f"Database stopped, waiting for {delay} seconds before retrying...")
                time.sleep(delay)
            else:
                raise e

    raise Exception('Waited for RDS Data but still getting error')


def cleardown_txc_tables():
    try:
        with db_connection.cursor() as cursor:
            for query in queries:
                cursor.execute(query)

        db_connection.commit()

    except Exception as e:
        logger.error("ERROR: Failed to truncate tables.")
        logger.error(e)
        raise e


def get_tnds_data():
    ftp = FTP(host=FTP_CREDENTIALS["host"])
    ftp.login(FTP_CREDENTIALS["username"], FTP_CREDENTIALS["password"])

    files = ftp.nlst()

    for file in files:
        if file.endswith(".zip"):
            ftp.retrbinary("RETR " + file, open(FILE_DIR + file, "wb").write)

    ftp.close()


def get_bods_data():
    resp = urlopen(os.getenv("BODS_URL"))

    return ZipFile(BytesIO(resp.read()))


def upload_tnds_data_to_s3():
    for file in os.listdir(FILE_DIR):
        bucket = os.getenv("ZIPPED_BUCKET_NAME")
        content_type = "application/zip"

        s3.meta.client.upload_file(
            FILE_DIR + file,
            bucket,
            "tnds/" + file,
            ExtraArgs={
                "ContentType": content_type
            }
        )


def upload_bods_data_to_s3(zip_file):
    xml_count = 0

    for filename in zip_file.namelist():
        if filename.endswith(".xml"):
            s3.meta.client.upload_fileobj(
                zip_file.open(filename),
                os.getenv("TXC_BUCKET_NAME"),
                "bods/" + filename,
                ExtraArgs={
                    "ContentType": "application/xml"
                }
            )

            xml_count += 1

        elif filename.endswith(".zip"):
            s3.meta.client.upload_fileobj(
                zip_file.open(filename),
                os.getenv("ZIPPED_BUCKET_NAME"),
                "bods/" + filename,
                ExtraArgs={
                    "ContentType": "application/zip"
                }
            )

    cloudwatch.put_metric_data(
        MetricData=[
            {
                "MetricName": "TxcFilesCopied",
                "Dimensions": [
                    {
                        "Name": "By Data Source",
                        "Value": "bods"
                    },
                ],
                "Unit": "None",
                "Value": xml_count
            },
        ],
        Namespace="ReferenceDataService/Retrievers"
    )


def main(event, context):
    try:
        if os.getenv("BODS_URL") is not None:
            logger.info("Starting BODS retriever...")
            wait_for_db()
            cleardown_txc_tables()
            lambda_client.invoke(FunctionName=os.getenv("TNDS_FUNCTION"),
                                 InvocationType="Event")
            bods_zip = get_bods_data()
            upload_bods_data_to_s3(bods_zip)

        if FTP_CREDENTIALS is not None:
            logger.info("Starting TNDS retriever...")
            get_tnds_data()
            upload_tnds_data_to_s3()

    except Exception as e:
        if os.getenv("STAGE") is not None:
            ssm_client.put_parameter(
                Name="/scheduled/disable-table-renamer-" + os.getenv("STAGE"),
                Value="true",
                Type="String",
                Overwrite=True
            )
        logger.error(e)
        raise e
