import { z } from "zod";

export const snsMessageAttributeSchema = z.record(
    z.object({
        Type: z.string(),
        Value: z.string(),
    }),
);

export const snsMessageSchema = z.object({
    SignatureVersion: z.string(),
    Timestamp: z.string(),
    Signature: z.string(),
    SigningCertURL: z.string(),
    MessageId: z.string(),
    Message: z.string(),
    Type: z.string(),
    TopicArn: z.string(),
    MessageAttributes: snsMessageAttributeSchema.optional(),
    Subject: z.string().optional(),
    Token: z.string().optional(),
    UnsubscribeURL: z.string().optional(),
    SubscribeURL: z.string().optional(),
});

export type SnsMessage = z.infer<typeof snsMessageSchema>;
