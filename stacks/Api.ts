import { Api, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { DnsStack } from "./Dns";

export function ApiStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);
    const { hostedZone } = use(DnsStack);

    const { ROOT_DOMAIN: rootDomain } = process.env;

    if (!rootDomain) {
        throw new Error("ROOT_DOMAIN must be set");
    }

    const stopsFunction = new Function(stack, "ref-data-service-get-stops-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-stops-function-${stack.stage}`,
        handler: "packages/api/get-stops.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            MAX_ATCO_CODES: "50",
            MAX_NAPTAN_CODES: "50",
            MAX_ADMIN_AREA_CODES: "50",
            IS_LOCAL: !["test", "preprod", "prod"].includes(stack.stage) ? "true" : "false",
        },
        runtime: "nodejs18.x",
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

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
            MAX_NOC_CODES: "50",
        },
        runtime: "nodejs18.x",
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

    const servicesFunction = new Function(stack, "ref-data-service-get-services-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-services-function-${stack.stage}`,
        handler: "packages/api/get-services.main",
        timeout: 30,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs18.x",
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

    const serviceByIdFunction = new Function(stack, "ref-data-service-get-service-by-id-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-service-by-id-function-${stack.stage}`,
        handler: "packages/api/get-service-by-id.main",
        timeout: 30,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs18.x",
        logRetention: stack.stage === "production" ? "three_months" : "two_weeks",
    });

    const subDomain = ["test", "preprod", "prod"].includes(stack.stage) ? "api" : `api.${stack.stage}`;

    const allowedOrigins = [`https://${stack.stage}.cdd.${rootDomain}`];

    if (!["preprod", "prod"].includes(stack.stage)) {
        allowedOrigins.push("http://localhost:3000");
    }

    const api = new Api(stack, "ref-data-service-api", {
        routes: {
            "GET /stops": stopsFunction,
            "GET /operators": operatorsFunction,
            "GET /operators/{nocCode}": operatorsFunction,
            "GET /operators/{nocCode}/services": servicesFunction,
            "GET /operators/{nocCode}/services/{serviceId}": serviceByIdFunction,
        },
        customDomain: {
            domainName: `${subDomain}.${hostedZone.zoneName}`,
            hostedZone: hostedZone.zoneName,
            path: "v1",
        },
        cors: {
            allowMethods: ["GET"],
            allowHeaders: ["Accept", "Content-Type", "Authorization"],
            allowOrigins: allowedOrigins,
        },
        cdk: {
            httpApi: {
                apiName: `ref-data-service-api-${stack.stage}`,
            },
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
