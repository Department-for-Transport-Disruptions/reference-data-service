import { RDS, RDSProps, StackContext } from "sst/constructs";

export function DatabaseStack({ stack }: StackContext) {
    const autoscalingConfig: { [key: string]: RDSProps["scaling"] } = {
        preprod: {
            minCapacity: "ACU_2",
            maxCapacity: "ACU_4",
            autoPause: false,
        },
        prod: {
            minCapacity: "ACU_2",
            maxCapacity: "ACU_4",
            autoPause: false,
        },
        test: {
            minCapacity: "ACU_2",
            maxCapacity: "ACU_4",
            autoPause: false,
        },
    };

    const cluster = new RDS(stack, "ref-data-service-db-cluster", {
        engine: "mysql5.7",
        defaultDatabaseName: "ref_data",
        migrations: "services/migrations",
        scaling: autoscalingConfig[stack.stage] ?? {
            minCapacity: "ACU_2",
            maxCapacity: "ACU_4",
            autoPause: 10,
        },
    });

    return {
        cluster,
    };
}
