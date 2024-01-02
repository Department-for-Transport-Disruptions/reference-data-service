import { Schedule } from "aws-cdk-lib/aws-events";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Cron, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { S3Stack } from "./S3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { disableTableRenamerParamName } from "@reference-data-service/core/ssm";

export function RetrieversStack({ stack }: StackContext) {
    const { csvBucket, txcBucket, txcZippedBucket, nptgBucket } = use(S3Stack);
    const { cluster } = use(DatabaseStack);

    const enableSchedule = stack.stage === "prod" || stack.stage === "preprod" || stack.stage === "test";

    const txcZippedBucketCdk = Bucket.fromBucketName(
        stack,
        "ref-data-service-txc-zipped-bucket",
        txcZippedBucket.bucketName,
    );

    const defaultDaySchedule = stack.stage === "test" ? "*/4" : "*/2";

    const nocRetriever = new Function(stack, `ref-data-service-noc-retriever`, {
        functionName: `ref-data-service-noc-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/data-retriever/index.main",
        runtime: "nodejs20.x",
        timeout: 60,
        memorySize: 256,
        environment: {
            DATA_URL:
                "https://www.travelinedata.org.uk/wp-content/themes/desktop/nocadvanced_download.php?reportFormat=csvFlatFile&allTable%5B%5D=table_noclines&allTable%5B%5D=table_noc_table&allTable%5B%5D=table_public_name&submit=Submit",
            BUCKET_NAME: csvBucket.bucketName,
            CONTENT_TYPE: "text/csv",
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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
                schedule: Schedule.cron({ minute: "50", hour: "1", day: defaultDaySchedule }),
            },
        },
    });

    const naptanRetriever = new Function(stack, `ref-data-service-naptan-retriever`, {
        functionName: `ref-data-service-naptan-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/data-retriever/index.main",
        runtime: "nodejs20.x",
        timeout: 60,
        memorySize: 512,
        environment: {
            DATA_URL: "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv",
            BUCKET_NAME: csvBucket.bucketName,
            CONTENT_TYPE: "text/csv",
            TARGET_FILE: "Stops.csv",
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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
                schedule: Schedule.cron({ minute: "55", hour: "1", day: defaultDaySchedule }),
            },
        },
    });

    const nptgRetriever = new Function(stack, `ref-data-service-nptg-retriever`, {
        functionName: `ref-data-service-nptg-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/data-retriever/index.main",
        runtime: "nodejs20.x",
        timeout: 60,
        memorySize: 512,
        environment: {
            DATA_URL: "https://naptan.api.dft.gov.uk/v1/nptg",
            BUCKET_NAME: nptgBucket.bucketName,
            CONTENT_TYPE: "application/xml",
            TARGET_FILE: "nptg.xml",
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${nptgBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
    });

    new Cron(stack, "ref-data-service-nptg-retriever-cron", {
        job: nptgRetriever,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: Schedule.cron({ minute: "0", hour: "2", day: defaultDaySchedule }),
            },
        },
    });

    const ftpSecret = Secret.fromSecretNameV2(
        stack,
        `reference-data-service-tnds-ftp-credentials-secret`,
        `reference-data-service-tnds-ftp-credentials`,
    );

    const tndsRetriever = new Function(stack, "ref-data-service-tnds-retriever", {
        functionName: `ref-data-service-tnds-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/tnds-retriever/index.main",
        runtime: "python3.11",
        timeout: 300,
        memorySize: 1024,
        environment: {
            TXC_BUCKET_NAME: txcBucket.bucketName,
            ZIPPED_BUCKET_NAME: txcZippedBucket.bucketName,
            FTP_CREDENTIALS_SECRET_ARN: ftpSecret.secretArn || "",
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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

    const bodsRegionRetriever = new Function(stack, "ref-data-service-bods-region-retriever", {
        functionName: `ref-data-service-bods-region-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/bods-retriever/region-retriever.main",
        runtime: "nodejs20.x",
        timeout: 300,
        memorySize: 2048,
        environment: {
            BASE_DATA_URL: "https://data.bus-data.dft.gov.uk/timetable/download/bulk_archive",
            TXC_BUCKET_NAME: txcBucket.bucketName,
            TXC_ZIPPED_BUCKET_NAME: txcZippedBucket.bucketName,
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${txcBucket.bucketArn}/*`, `${txcZippedBucket.bucketArn}/*`],
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

    const bodsRetriever = new Function(stack, `ref-data-service-bods-retriever`, {
        bind: [cluster],
        functionName: `ref-data-service-bods-retriever-${stack.stage}`,
        handler: "packages/ref-data-retrievers/bods-retriever/index.main",
        runtime: "nodejs20.x",
        timeout: 180,
        memorySize: 512,
        environment: {
            REGION_RETRIEVER_FUNCTION_NAME: bodsRegionRetriever.functionName,
            TNDS_RETRIEVER_FUNCTION_NAME: tndsRetriever.functionName,
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["lambda:invokeAsync", "lambda:invokeFunction"],
                resources: [bodsRegionRetriever.functionArn, tndsRetriever.functionArn],
            }),
            new PolicyStatement({
                actions: ["ssm:PutParameter"],
                resources: ["*"],
            }),
        ],
    });

    const txcRetrieverSchedule: { [key: string]: Schedule } = {
        preprod: Schedule.cron({ minute: "00", hour: "3", day: defaultDaySchedule }),
        prod: Schedule.cron({ minute: "30", hour: "2", day: defaultDaySchedule }),
    };

    new Cron(stack, "ref-data-service-bods-retriever-cron", {
        job: bodsRetriever,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule:
                    txcRetrieverSchedule[stack.stage] ||
                    Schedule.cron({ minute: "45", hour: "2", day: defaultDaySchedule }),
            },
        },
    });

    const unzipper = new Function(stack, "ref-data-service-txc-unzipper", {
        bind: [cluster],
        functionName: `ref-data-service-txc-unzipper-${stack.stage}`,
        handler: "packages/ref-data-retrievers/txc-unzipper/index.main",
        runtime: "python3.11",
        timeout: 900,
        memorySize: 1536,
        diskSize: "3072 MB",
        retryAttempts: 0,
        environment: {
            BUCKET_NAME: txcBucket.bucketName,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["s3:PutObject"],
                resources: [`${txcBucket.bucketArn}/*`, `${txcZippedBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [`${txcZippedBucket.bucketArn}/*`],
            }),
            new PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        ],
        enableLiveDev: false,
    });

    txcZippedBucketCdk.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(unzipper));

    new StringParameter(stack, "disableTableRenamer", {
        parameterName: `${disableTableRenamerParamName}-${stack.stage}`,
        stringValue: "false",
    });
}
