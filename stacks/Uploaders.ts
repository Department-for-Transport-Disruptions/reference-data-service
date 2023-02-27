import { Duration } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { S3Stack } from "./S3";

export function UploadersStack({ stack }: StackContext) {
    const { csvBucket, txcBucket } = use(S3Stack);
    const { cluster } = use(DatabaseStack);

    const csvBucketCdk = Bucket.fromBucketName(stack, "ref-data-service-csv-bucket", csvBucket.bucketName);
    const txcBucketCdk = Bucket.fromBucketName(stack, "ref-data-service-txc-bucket", txcBucket.bucketName);

    const csvUploader = new Function(stack, `ref-data-service-csv-uploader`, {
        bind: [cluster],
        functionName: `ref-data-service-csv-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/csv-uploader/index.main",
        runtime: "nodejs18.x",
        timeout: 600,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${csvBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
    });

    csvBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(csvUploader));

    const txcUploader = new Function(stack, "ref-data-service-txc-uploader", {
        bind: [cluster],
        functionName: `ref-data-service-txc-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/txc-uploader/index.main",
        runtime: "python3.9",
        timeout: 300,
        memorySize: 1024,
        // reservedConcurrentExecutions: 40, // TODO: uncomment this when quota increase approved
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            CLUSTER_ARN: cluster.clusterArn,
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${txcBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
        enableLiveDev: false,
        maxEventAge: Duration.hours(3),
    });

    txcBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(txcUploader));
}
