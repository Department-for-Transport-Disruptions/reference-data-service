import { Duration } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Cron, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { S3Stack } from "./S3";

export function UploadersStack({ stack }: StackContext) {
    const { csvBucket, txcBucket, nptgBucket } = use(S3Stack);
    const { cluster } = use(DatabaseStack);

    const csvBucketCdk = Bucket.fromBucketName(stack, "ref-data-service-csv-bucket", csvBucket.bucketName);
    const txcBucketCdk = Bucket.fromBucketName(stack, "ref-data-service-txc-bucket", txcBucket.bucketName);
    const nptgBucketCdk = Bucket.fromBucketName(stack, "ref-data-service-nptg-bucket", nptgBucket.bucketName);

    const enableSchedule = stack.stage === "prod" || stack.stage === "preprod" || stack.stage === "test";

    const csvUploader = new Function(stack, `ref-data-service-csv-uploader`, {
        bind: [cluster],
        functionName: `ref-data-service-csv-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/csv-uploader/index.main",
        runtime: "nodejs20.x",
        timeout: 600,
        memorySize: 3008,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${csvBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
    });

    csvBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(csvUploader));

    const txcUploader = new Function(stack, "ref-data-service-txc-uploader", {
        bind: [cluster],
        functionName: `ref-data-service-txc-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/txc-uploader/index.main",
        runtime: "python3.11",
        timeout: 600,
        memorySize: 1024,
        reservedConcurrentExecutions: 40,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            CLUSTER_ARN: cluster.clusterArn,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${txcBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
        maxEventAge: Duration.hours(3),
        enableLiveDev: false,
    });

    txcBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(txcUploader));

    const nptgUploader = new Function(stack, "ref-data-service-nptg-uploader", {
        bind: [cluster],
        functionName: `ref-data-service-nptg-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/nptg-uploader/index.main",
        runtime: "nodejs20.x",
        timeout: 450,
        memorySize: 2048,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${nptgBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
    });

    nptgBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(nptgUploader));

    const cleanupRoadworks = new Function(stack, `ref-data-service-cleanup-roadworks`, {
        bind: [cluster],
        functionName: `ref-data-service-cleanup-roadworks-${stack.stage}`,
        handler: "packages/ref-data-uploaders/cleanup-roadworks/index.main",
        runtime: "nodejs20.x",
        timeout: 600,
        memorySize: 1024,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
    });

    new Cron(stack, "ref-data-service-cleanup-roadworks-cron", {
        job: cleanupRoadworks,
        enabled: enableSchedule,
        schedule: "cron(0 1 * * ? *)",
    });
}
