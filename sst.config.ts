import { SSTConfig } from "sst";
import { ApiStack } from "./stacks/Api";
import { DatabaseStack } from "./stacks/Database";
import { DnsStack } from "./stacks/Dns";
import { QueueStack } from "./stacks/Queue";
import { RetrieversStack } from "./stacks/Retrievers";
import { S3Stack } from "./stacks/S3";
import { TableRenamerStack } from "./stacks/TableRenamer";
import { UploadersStack } from "./stacks/Uploaders";

export default {
    config() {
        return {
            name: "reference-data-service",
            region: "eu-west-2",
        };
    },
    stacks(app) {
        app.stack(S3Stack);
        app.stack(DnsStack);
        app.stack(DatabaseStack);
        app.stack(RetrieversStack);
        app.stack(UploadersStack);
        app.stack(TableRenamerStack);
        app.stack(QueueStack);
        app.stack(ApiStack);
    },
} satisfies SSTConfig;
