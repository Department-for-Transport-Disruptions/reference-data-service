import { SSMClient, PutParameterCommandInput, PutParameterCommand } from "@aws-sdk/client-ssm";
import { Logger } from "@smithy/types";

const ssmClient = new SSMClient({ region: "eu-west-2" });

export const disableTableRenamerParamName = "/scheduled/disable-table-renamer";

export const putTableRenamerDisableParameter = async (stage: string, value: "true" | "false", logger: Logger) => {
    try {
        const input: PutParameterCommandInput = {
            Name: `${disableTableRenamerParamName}-${stage}`,
            Value: value,
            Type: "String",
            Overwrite: true,
        };
        const command = new PutParameterCommand(input);
        await ssmClient.send(command);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error);
        }
    }
};
