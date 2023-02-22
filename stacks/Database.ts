import { RDS, StackContext } from "sst/constructs";

export function DatabaseStack({ stack }: StackContext) {
    const cluster = new RDS(stack, `ref-data-service-db-cluster`, {
        engine: "mysql5.7",
        defaultDatabaseName: "ref_data",
        migrations: "services/migrations",
        scaling: {
            minCapacity: "ACU_2",
            maxCapacity: stack.stage === "prod" || stack.stage === "preprod" ? "ACU_4" : "ACU_2",
            autoPause: stack.stage === "prod" ? false : 10,
        },
    });

    return {
        cluster,
    };
}
