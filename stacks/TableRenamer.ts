import { Schedule } from "aws-cdk-lib/aws-events";
import { Cron, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";

export function TableRenamerStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);

    const enableSchedule = stack.stage === "prod" || stack.stage === "preprod";

    const tableRenamer = new Function(stack, `ref-data-service-table-renamer`, {
        bind: [cluster],
        functionName: `ref-data-service-table-renamer-${stack.stage}`,
        handler: "packages/table-renamer/index.main",
        runtime: "nodejs18.x",
        timeout: 600,
        memorySize: 256,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

    new Cron(stack, "ref-data-service-table-renamer-cron", {
        job: tableRenamer,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: Schedule.cron({ minute: "30", hour: "5" }),
            },
        },
    });
}
