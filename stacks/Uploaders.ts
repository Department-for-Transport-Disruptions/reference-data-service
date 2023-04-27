import { Duration } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { S3Stack } from "./S3";

export function UploadersStack({ stack }: StackContext) {
    const { csvBucket, txcBucket } = use(S3Stack);
    const { cluster } = use(DatabaseStack);

    const csvUploader = new Function(stack, `ref-data-service-csv-uploader`, {
        bind: [cluster],
        functionName: `ref-data-service-csv-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/csv-uploader/index.main",
        runtime: "nodejs18.x",
        timeout: 600,
        memorySize: 3008,
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

    csvBucket.addNotifications(stack, {
        objectCreated: {
            events: ["object_created"],
            function: csvUploader,
        },
    });

    const txcUploader = new Function(stack, "ref-data-service-txc-uploader", {
        bind: [cluster],
        functionName: `ref-data-service-txc-uploader-${stack.stage}`,
        handler: "packages/ref-data-uploaders/txc-uploader/index.main",
        runtime: "python3.9",
        timeout: 300,
        memorySize: 1024,
        reservedConcurrentExecutions: 40,
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

    txcBucket.addNotifications(stack, {
        objectCreated: {
            events: ["object_created"],
            function: txcUploader,
        },
    });
}
