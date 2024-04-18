import { Api, Function, StackContext, use } from "sst/constructs";
import { DatabaseStack } from "./Database";
import { DnsStack } from "./Dns";
import { QueueStack } from "./Queue";
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";

export function ApiStack({ stack }: StackContext) {
    const { cluster } = use(DatabaseStack);
    const { hostedZone } = use(DnsStack);
    const { streetManagerSqsQueue } = use(QueueStack);

    const { ROOT_DOMAIN: rootDomain } = process.env;

    const isSandbox = !["test", "preprod", "prod"].includes(stack.stage);

    if (!rootDomain) {
        throw new Error("ROOT_DOMAIN must be set");
    }

    let prodDomain = "";

    if (stack.stage === "prod") {
        prodDomain = process.env.PROD_DOMAIN?.toString() ?? "";

        if (!prodDomain) {
            throw new Error("PROD_DOMAIN must be set in production");
        }
    }

    const streetManagerTestTopic: Topic | null = new Topic(stack, "street-manager-test-topic", {
        topicName: `street-manager-test-topic-${stack.stage}`,
    });

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
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const servicesForOperatorFunction = new Function(stack, "ref-data-service-get-services-for-operator-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-services-for-operator-function-${stack.stage}`,
        handler: "packages/api/get-services-for-operator.main",
        timeout: 30,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
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
            MAX_ATCO_CODES: "100",
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const serviceStopsFunction = new Function(stack, "ref-data-service-get-service-stops-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-service-stops-function-${stack.stage}`,
        handler: "packages/api/get-service-stops.main",
        timeout: 30,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const serviceRoutesFunction = new Function(stack, "ref-data-service-get-service-routes-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-service-routes-function-${stack.stage}`,
        handler: "packages/api/get-service-routes.main",
        timeout: 30,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const areaCodeFunction = new Function(stack, "ref-data-service-get-admin-area-codes-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-admin-area-codes-function-${stack.stage}`,
        handler: "packages/api/get-admin-area-codes.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const adminAreasFunction = new Function(stack, "ref-data-service-get-admin-areas-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-admin-areas-function-${stack.stage}`,
        handler: "packages/api/get-admin-areas.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const postStreetManagerFunction = new Function(stack, "ref-data-service-post-street-manager-function", {
        bind: [streetManagerSqsQueue, cluster],
        functionName: `ref-data-service-post-street-manager-function-${stack.stage}`,
        handler: "packages/api/post-street-manager.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            STREET_MANAGER_SQS_QUEUE_URL: streetManagerSqsQueue.queueUrl,
            TEST_STREET_MANAGER_TOPIC_ARN: streetManagerTestTopic?.topicArn ?? "",
            STREET_MANAGER_MESSAGE_TOPIC_ARN: streetManagerTestTopic?.topicArn ?? "",
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const roadworksFunction = new Function(stack, "ref-data-service-get-roadworks-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-roadworks-function-${stack.stage}`,
        handler: "packages/api/get-roadworks.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
            MAX_ADMIN_AREA_CODES: "50",
            IS_LOCAL: isSandbox ? "true" : "false",
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const roadworkByIdFunction = new Function(stack, "ref-data-service-get-roadwork-by-id-function", {
        bind: [cluster],
        functionName: `ref-data-service-get-roadwork-by-id-function-${stack.stage}`,
        handler: "packages/api/get-roadwork-by-id.main",
        timeout: 10,
        memorySize: 512,
        environment: {
            DATABASE_NAME: cluster.defaultDatabaseName,
            DATABASE_SECRET_ARN: cluster.secretArn,
            DATABASE_RESOURCE_ARN: cluster.clusterArn,
        },
        runtime: "nodejs20.x",
        logRetention: stack.stage === "prod" ? "one_month" : "two_weeks",
    });

    const subDomain = !isSandbox ? "api" : `api.${stack.stage}`;

    const allowedOrigins = [
        stack.stage === "prod" ? `https://${prodDomain}` : `https://${stack.stage}.cdd.${rootDomain}`,
    ];

    if (!["preprod", "prod"].includes(stack.stage)) {
        allowedOrigins.push("http://localhost:3000");
    }

    const api = new Api(stack, "ref-data-service-api", {
        routes: {
            "GET /stops": stopsFunction,
            "GET /operators": operatorsFunction,
            "GET /operators/{nocCode}": operatorsFunction,
            "GET /operators/{nocCode}/services": servicesForOperatorFunction,
            "GET /operators/{nocCode}/services/{serviceId}": serviceByIdFunction,
            "GET /services": servicesFunction,
            "GET /services/{serviceId}/stops": serviceStopsFunction,
            "GET /services/{serviceId}/routes": serviceRoutesFunction,
            "GET /area-codes": areaCodeFunction,
            "GET /admin-areas": adminAreasFunction,
            "POST /street-manager": postStreetManagerFunction,
            "GET /roadworks": roadworksFunction,
            "GET /roadworks/{permitReferenceNumber}": roadworkByIdFunction,
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

    if (streetManagerTestTopic) {
        new Subscription(stack, "street-manager-test-subscription", {
            endpoint: `${api.url}/street-manager`,
            protocol: SubscriptionProtocol.HTTPS,
            topic: streetManagerTestTopic,
        });
    }

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
