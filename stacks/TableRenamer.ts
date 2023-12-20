import { Schedule } from "aws-cdk-lib/aws-events";
import { Cron, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export function TableRenamerStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);

    const enableSchedule = stack.stage === "prod" || stack.stage === "preprod" || stack.stage === "test";

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
            STAGE: stack.stage,
        },
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
        permissions: [
            new PolicyStatement({
                actions: ["ssm:PutParameter", "ssm:GetParameter"],
                resources: ["*"],
            }),
        ],
    });

    new Cron(stack, "ref-data-service-table-renamer-cron", {
        job: tableRenamer,
        enabled: enableSchedule,
        cdk: {
            rule: {
                schedule: Schedule.cron({ minute: "00", hour: "6" }),
            },
        },
    });
}
