import { Schedule } from "aws-cdk-lib/aws-events";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Cron, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { S3Stack } from "./S3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export function RetrieversStack({ stack }: StackContext) {
    const { csvBucket, txcBucket, txcZippedBucket } = use(S3Stack);
    const { cluster } = use(DatabaseStack);

    const enableSchedule = stack.stage === "prod" || stack.stage === "preprod";

    const txcZippedBucketCdk = Bucket.fromBucketName(
        stack,
        "ref-data-service-txc-zipped-bucket",
        txcZippedBucket.bucketName,
    );

    const nocRetriever = new Function(stack, `ref-data-service-noc-retriever`, {
        functionName: `ref-data-service-noc-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/csv-retriever/index.main",
        runtime: "nodejs18.x",
        timeout: 60,
        memorySize: 256,
        environment: {
            DATA_URL:
                "https://www.travelinedata.org.uk/wp-content/themes/desktop/nocadvanced_download.php?reportFormat=csvFlatFile&allTable%5B%5D=table_noclines&allTable%5B%5D=table_noc_table&allTable%5B%5D=table_public_name&submit=Submit",
            BUCKET_NAME: csvBucket.bucketName,
            CONTENT_TYPE: "text/csv",
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${csvBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
    });

    new Cron(stack, "ref-data-service-noc-retriever-cron", {
        job: nocRetriever,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: Schedule.cron({ minute: "0", hour: "2" }),
            },
        },
    });

    const naptanRetriever = new Function(stack, `ref-data-service-naptan-retriever`, {
        functionName: `ref-data-service-naptan-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/csv-retriever/index.main",
        runtime: "nodejs18.x",
        timeout: 60,
        memorySize: 512,
        environment: {
            DATA_URL: "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv",
            BUCKET_NAME: csvBucket.bucketName,
            CONTENT_TYPE: "text/csv",
            TARGET_FILE: "Stops.csv",
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${csvBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
    });

    new Cron(stack, "ref-data-service-naptan-retriever-cron", {
        job: naptanRetriever,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: Schedule.cron({ minute: "0", hour: "2" }),
            },
        },
    });

    const ftpSecret = Secret.fromSecretNameV2(
        stack,
        `reference-data-service-tnds-ftp-credentials-secret`,
        `reference-data-service-tnds-ftp-credentials`,
    );

    const tndsRetriever = new Function(stack, "ref-data-service-tnds-retriever", {
        bind: [cluster],
        functionName: `ref-data-service-tnds-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/txc-retriever/index.main",
        runtime: "python3.9",
        timeout: 900,
        memorySize: 3008,
        environment: {
            TXC_BUCKET_NAME: txcBucket.bucketName,
            ZIPPED_BUCKET_NAME: txcZippedBucket.bucketName,
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            CLUSTER_ARN: cluster.clusterArn,
            FTP_CREDENTIALS_SECRET_ARN: ftpSecret.secretArn || "",
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${txcZippedBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
            new PolicyStatement({
                actions: ["secretsmanager:GetSecretValue"],
                resources: [`${ftpSecret.secretArn}-??????`],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
        enableLiveDev: false,
    });

    const bodsRetriever = new Function(stack, "ref-data-service-bods-retriever", {
        bind: [cluster],
        functionName: `ref-data-service-bods-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/txc-retriever/index.main",
        runtime: "python3.9",
        timeout: 900,
        memorySize: 3008,
        environment: {
            TXC_BUCKET_NAME: txcBucket.bucketName,
            ZIPPED_BUCKET_NAME: txcZippedBucket.bucketName,
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            CLUSTER_ARN: cluster.clusterArn,
            BODS_URL: "https://data.bus-data.dft.gov.uk/timetable/download/bulk_archive",
            TNDS_FUNCTION: tndsRetriever.functionName,
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${txcBucket.bucketArn}/*`, `${txcZippedBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["lambda:invokeAsync", "lambda:invokeFunction"],
                resources: [tndsRetriever.functionArn],
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
        enableLiveDev: false,
    });

    const txcRetrieverSchedule: { [key: string]: Schedule } = {
        preprod: Schedule.cron({ minute: "30", hour: "3" }),
        prod: Schedule.cron({ minute: "30", hour: "2" }),
    };

    new Cron(stack, "ref-data-service-bods-retriever-cron", {
        job: bodsRetriever,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: txcRetrieverSchedule[stack.stage] || Schedule.cron({ minute: "00", hour: "4" }),
            },
        },
    });

    const unzipper = new Function(stack, "ref-data-service-txc-unzipper", {
        bind: [cluster],
        functionName: `ref-data-service-txc-unzipper-${stack.stage}`,
        handler: "packages/ref-data-retrievers/txc-unzipper/index.main",
        runtime: "python3.9",
        timeout: 900,
        memorySize: 1024,
        retryAttempts: 0,
        environment: {
            BUCKET_NAME: txcBucket.bucketName,
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${txcBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${txcZippedBucket.bucketArn}/*`],
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
        enableLiveDev: false,
    });

    txcZippedBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(unzipper));

    new StringParameter(stack, "disableTableRenamer", {
        parameterName: "/scheduled/disable-table-renamer",
        stringValue: "false",
    });
}
