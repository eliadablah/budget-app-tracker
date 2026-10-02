// src/lib/parameterStore.ts
// What: reads and writes encrypted values in AWS Parameter Store. Used for
// anything that must never sit in code, in the database, or in Terraform
// state: the Plaid API keys, and each connected bank's access token.
//
// Naming note: this file is deliberately NOT called secrets.ts - the
// repo's .gitignore skips anything named "secrets.*" (a guard against
// committing real secret files), which would silently leave this source
// file out of Git and break the build everywhere but this laptop.

import {
  DeleteParameterCommand,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});

export async function getSecret(name: string): Promise<string> {
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(`Parameter ${name} is empty`);
  }
  return value;
}

export async function putSecret(name: string, value: string): Promise<void> {
  await ssm.send(
    new PutParameterCommand({ Name: name, Value: value, Type: "SecureString", Overwrite: true })
  );
}

// Deleting something already gone counts as success.
export async function deleteSecret(name: string): Promise<void> {
  try {
    await ssm.send(new DeleteParameterCommand({ Name: name }));
  } catch (err) {
    if (err instanceof ParameterNotFound) return;
    throw err;
  }
}
