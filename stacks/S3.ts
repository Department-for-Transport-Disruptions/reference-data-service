import { BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Bucket, Stack, StackContext, toCdkDuration } from "sst/constructs";

export function S3Stack({ stack }: StackContext) {
    const csvBucket = createS3Bucket(stack, "csv-data");
    const txcBucket = createS3Bucket(stack, "txc-data", 5);
    const txcZippedBucket = createS3Bucket(stack, "txc-data-zipped", 5);
    const nptgBucket = createS3Bucket(stack, "nptg-data", 5);

    return {
        csvBucket,
        txcBucket,
        txcZippedBucket,
        nptgBucket,
    };
}

const createS3Bucket = (stack: Stack, name: string, expirationDays?: number) =>
    new Bucket(stack, `ref-data-service-${name}`, {
        name: `ref-data-service-${name}-${stack.stage}`,
        cdk: {
            bucket: {
                blockPublicAccess: {
                    blockPublicAcls: true,
                    blockPublicPolicy: true,
                    ignorePublicAcls: true,
                    restrictPublicBuckets: true,
                },
                encryption: BucketEncryption.S3_MANAGED,
                lifecycleRules: expirationDays
                    ? [{ enabled: true, expiration: toCdkDuration(`${expirationDays} days`) }]
                    : [],
            },
        },
    });
