// src/lib/auth.ts
// What: the one place that knows how to talk to Cognito directly. Exchanges
// an email + password for a short-lived login token (the "wristband"), and
// manages where that token is kept between page loads.
//
// Known simplification: tokens are not automatically refreshed when they
// expire (Cognito ID tokens last 1 hour). When one expires, the API starts
// returning 401s again and the app falls back to the login screen - fine for
// a personal project; real refresh-token rotation can be added later.

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = import.meta.env.VITE_AWS_REGION as string;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string;

const client = new CognitoIdentityProviderClient({ region: REGION });

const STORAGE_KEY = "budget-app-id-token";

export async function login(email: string, password: string): Promise<void> {
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const idToken = result.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error("Login did not return a token");
  }

  // sessionStorage (not localStorage): survives a page refresh, but clears
  // when the browser tab closes - a reasonable middle ground for a personal
  // app, without a login token lingering indefinitely on a shared computer.
  sessionStorage.setItem(STORAGE_KEY, idToken);
}

export function getIdToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function logout(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
