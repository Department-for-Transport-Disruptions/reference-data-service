import { HostedZone, IHostedZone } from "aws-cdk-lib/aws-route53";
import { StackContext } from "sst/constructs";

export const DnsStack = ({ stack }: StackContext) => {
    const { ROOT_DOMAIN: rootDomain } = process.env;

    if (!rootDomain) {
        throw new Error("ROOT_DOMAIN must be set");
    }

    let hostedZone: IHostedZone;

    if (["test", "preprod", "prod"].includes(stack.stage)) {
        hostedZone = new HostedZone(stack, "ref-data-service-hosted-zone", {
            zoneName: `${stack.stage}.ref-data.${rootDomain}`,
        });
    } else {
        hostedZone = HostedZone.fromLookup(stack, "ref-data-service-hosted-zone", {
            domainName: `sandbox.ref-data.${rootDomain}`,
        });
    }

    return {
        hostedZone,
    };
};
