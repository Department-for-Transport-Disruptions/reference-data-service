import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

const replaceSpecialCharacters = (input: string) => input.replace(/[^a-zA-Z0-9._\-!\*\'\(\)\/]/g, "_");

const client = new S3Client({ region: "eu-west-2" });

export const putS3Object = (input: PutObjectCommandInput) =>
  client.send(
    new PutObjectCommand({
      ...input,
      Key: input.Key ? replaceSpecialCharacters(input.Key) : undefined,
    }),
  );

