import boto3
import json
import os
import aurora_data_api
import logging
from ftplib import FTP
from zipfile import ZipFile
from io import BytesIO
from urllib.request import urlopen

logger = logging.getLogger()
logger.setLevel(logging.INFO)

file_dir = "/tmp/"

s3 = boto3.resource("s3")
sm = boto3.client("secretsmanager")
cloudwatch = boto3.client("cloudwatch")
lambda_client = boto3.client("lambda")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ftp_credentials = None

if os.getenv("FTP_CREDENTIALS_SECRET_ARN") is not None:
    ftp_credentials_response = sm.get_secret_value(
        SecretId=os.getenv("FTP_CREDENTIALS_SECRET_ARN")
    )
    ftp_credentials = json.loads(ftp_credentials_response["SecretString"])

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
    "DROP TABLE IF EXISTS services_new",
    "CREATE TABLE services_new LIKE services",
    "SET FOREIGN_KEY_CHECKS=1"
]


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
    ftp = FTP(host=ftp_credentials["host"])
    ftp.login(ftp_credentials["username"], ftp_credentials["password"])

    files = ftp.nlst()

    for file in files:
        if file.endswith(".zip"):
            ftp.retrbinary("RETR " + file, open(file_dir + file, "wb").write)

    ftp.close()


def get_bods_data():
    resp = urlopen(os.getenv("BODS_URL"))

    return ZipFile(BytesIO(resp.read()))


def upload_tnds_data_to_s3():
    for file in os.listdir(file_dir):
        bucket = os.getenv("ZIPPED_BUCKET_NAME")
        content_type = "application/zip"

        s3.meta.client.upload_file(
            file_dir + file,
            bucket,
            "tnds/" + file,
            ExtraArgs={
                "ContentType": content_type
            }
        )


def upload_bods_data_to_s3(zip_file):
    xml_count = 0

    for filename in zip_file.namelist():
        if (filename.endswith(".xml")):
            s3.meta.client.upload_fileobj(
                zip_file.open(filename),
                os.getenv("TXC_BUCKET_NAME"),
                "bods/" + filename,
                ExtraArgs={
                    "ContentType": "application/xml"
                }
            )

            xml_count += 1

        elif (filename.endswith(".zip")):
            s3.meta.client.upload_fileobj(
                zip_file.open(filename),
                os.getenv("ZIPPED_BUCKET_NAME"),
                "bods/" + filename,
                ExtraArgs={
                    "ContentType": "application/zip"
                }
            )

    cloudwatch.put_metric_data(
        MetricData = [
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
            cleardown_txc_tables()
            lambda_client.invoke(FunctionName=os.getenv("TNDS_FUNCTION"),
                                 InvocationType="Event")
            bods_zip = get_bods_data()
            upload_bods_data_to_s3(bods_zip)

        if ftp_credentials is not None:
            logger.info("Starting TNDS retriever...")
            get_tnds_data()
            upload_tnds_data_to_s3()

    except Exception as e:
        logger.error(e)
        raise e
