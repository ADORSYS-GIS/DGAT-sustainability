import { createReactOidc } from "oidc-spa/react";
import { z } from "zod";

// Define the schema for the decoded ID token
const decodedIdTokenSchema = z.object({
  sub: z.string(),
  preferred_username: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  realm_access: z.object({
    roles: z.array(z.string())
  }).optional(),
  organisations: z.record(z.string(), z.unknown()).optional(),
  organisation_name: z.string().optional(),
  organisation: z.string().optional(),
  organizations: z.record(z.string(), z.object({
    id: z.string(),
    categories: z.array(z.string())
  })).optional(),
  categories: z.array(z.string()).optional(), // User's personal categories from ID token
});

export const { OidcProvider, useOidc, getOidc, withLoginEnforced, enforceLogin } =
  createReactOidc(async () => ({
    issuerUri: import.meta.env.VITE_KEYCLOAK_ISSUER_URI,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    homeUrl: import.meta.env.VITE_KEYCLOAK_HOME_URL,
    extraQueryParams: () => ({
      ui_locales: "en" 
    }),
    decodedIdTokenSchema
  }));

// Helper function for authenticated API calls
export const fetchWithAuth: typeof fetch = async (
  input,
  init
) => {
  const oidc = await getOidc();
  
  if (oidc.isUserLoggedIn) {
    const { accessToken } = await oidc.getTokens();

    (init ??= {}).headers = {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`
    };
  }

  return fetch(input, init);
};
