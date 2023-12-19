from ftplib import FTP
import json
import os
import logging
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

ftp_credentials_response = sm.get_secret_value(
    SecretId=os.getenv("FTP_CREDENTIALS_SECRET_ARN")
)
FTP_CREDENTIALS = json.loads(ftp_credentials_response["SecretString"])


def get_tnds_data():
    ftp = FTP(host=FTP_CREDENTIALS["host"])
    ftp.login(FTP_CREDENTIALS["username"], FTP_CREDENTIALS["password"])

    files = ftp.nlst()

    for file in files:
        if file.endswith(".zip"):
            ftp.retrbinary("RETR " + file, open(FILE_DIR + file, "wb").write)

    ftp.close()


def upload_tnds_data_to_s3():
    for file in os.listdir(FILE_DIR):
        bucket = os.getenv("ZIPPED_BUCKET_NAME")
        content_type = "application/zip"

        s3.meta.client.upload_file(
            FILE_DIR + file,
            bucket,
            "tnds/" + file,
            ExtraArgs={"ContentType": content_type},
        )


def main(event, context):
    try:
        logger.info("Starting TNDS retriever...")
        get_tnds_data()
        upload_tnds_data_to_s3()

    except Exception as e:
        if os.getenv("STAGE") is not None:
            ssm_client.put_parameter(
                Name="/scheduled/disable-table-renamer-" + os.getenv("STAGE"),
                Value="true",
                Type="String",
                Overwrite=True,
            )
        logger.error(e)
        raise e
