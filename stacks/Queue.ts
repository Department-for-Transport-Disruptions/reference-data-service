import { Queue, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";

export function QueueStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);

    const streetManagerSqsQueue = new Queue(stack, "ref-data-service-street-manager-queue", {
        consumer: {
            function: {
                bind: [cluster],
                handler: "packages/ref-data-uploaders/street-manager-uploader/index.main",
                timeout: 10,
                environment: {
                    DATABASE_NAME: cluster.defaultDatabaseName,
                    DATABASE_SECRET_ARN: cluster.secretArn,
                    DATABASE_RESOURCE_ARN: cluster.clusterArn,
                },
                runtime: "nodejs18.x",
                logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
            },
            cdk: {
                eventSource: {
                    batchSize: 1,
                },
            },
        },
    });

    return { streetManagerSqsQueue };
}
