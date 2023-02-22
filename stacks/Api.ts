import { Api, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";

export function ApiStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);

    const operatorsFunction = new Function(stack, "ref-data-service-get-operators-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-operators-function-${stack.stage}`,
        handler: "packages/api/get-operators.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs18.x",
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

    const api = new Api(stack, "ref-data-service-api", {
        routes: {
            "GET /operators": operatorsFunction,
            "GET /operators/{nocCode}": operatorsFunction,
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
