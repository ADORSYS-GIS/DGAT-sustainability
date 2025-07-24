# JWT Verification in the Sustainability Tool

## Overview

The Sustainability Tool uses a robust JWT verification system to authenticate users and validate access tokens issued by Keycloak. This document details how the JWT verification works, focusing on key retrieval, storage, and validation processes.

## Implementation Details

### Key Components

The JWT verification is implemented in the following files:

- `backend/src/web/handlers/jwt_validator.rs`: Contains the core `JwtValidator` implementation
- `backend/src/web/handlers/midlw.rs`: Provides middleware that uses the validator
- `backend/src/common/models/claims.rs`: Defines the JWT claims structure

### Key Retrieval Process

JWT verification requires access to public keys used by Keycloak to sign tokens. The implementation follows these steps to retrieve and use these keys:

1. **Dynamic Key Discovery**
   - When a token is presented for verification, the system extracts the Key ID (`kid`) from the token header
   - This `kid` uniquely identifies which key was used to sign the token
   - Reference: `jwt_validator.rs:43-46`

2. **JWKS Endpoint**
   - The system fetches Keycloak's public keys from the JWKS (JSON Web Key Set) endpoint
   - The endpoint URL is constructed as: `{keycloak_url}/realms/{realm}/protocol/openid-connect/certs`
   - This endpoint returns all active public keys in JWK format
   - Reference: `jwt_validator.rs:82-92`

3. **Key Construction**
   - Once the appropriate key is identified by its `kid`, the system extracts the RSA components (`n` and `e`)
   - These components are used to construct a `DecodingKey` that can verify the token's signature
   - Reference: `jwt_validator.rs:71-75`

### Caching Mechanism

To optimize performance and reduce network traffic, the system implements an in-memory caching strategy:

1. **Cache Structure**
   - Keys are cached in a `HashMap<String, DecodingKey>` where:
     - The key is the `kid` (Key ID)
     - The value is the corresponding `DecodingKey` instance
   - Reference: `jwt_validator.rs:20`

2. **Cache Lookup**
   - Before fetching keys from Keycloak, the system checks if the required key is already in the cache
   - If found, the cached key is used immediately
   - If not found, the system fetches the key from Keycloak and adds it to the cache
   - Reference: `jwt_validator.rs:58-62`

3. **Thread Safety**
   - The `JwtValidator` is wrapped in an `Arc<Mutex<>>` to ensure thread safety
   - This allows the validator (and its key cache) to be shared across multiple concurrent requests
   - Reference: `midlw.rs:32`

### Token Validation Process

The validation process is comprehensive and covers several security aspects:

1. **Signature Verification**
   - Confirms that the token was signed by Keycloak using the corresponding private key
   - Ensures the token has not been tampered with

2. **Claim Validation**
   - **Audience**: Verifies the token is intended for the Sustainability Tool application
   - **Issuer**: Confirms the token was issued by the expected Keycloak instance
   - **Expiration**: Checks that the token is not expired

3. **Role-Based Authorization**
   - After successful validation, the system can check for specific roles in the token
   - Middleware functions like `require_role()` enforce role-based access control
   - Reference: `midlw.rs:64-83`

## Security Considerations

1. **No Hard-Coded Keys**
   - The system does not use hard-coded cryptographic keys
   - All keys are obtained dynamically from the trusted Keycloak server

2. **Support for Key Rotation**
   - By fetching keys dynamically, the system automatically adapts to key rotations in Keycloak
   - This is a security best practice that allows for regular key rotation without service disruption

3. **Proper Validation**
   - Full validation of audience and issuer claims prevents token misuse
   - The validation ensures tokens can only be used for their intended purpose and by their intended recipient

## Example Flow

1. A client authenticates with Keycloak and receives a JWT
2. The client includes this JWT in an API request to the Sustainability Tool
3. The `auth_middleware` extracts the token from the Authorization header
4. The middleware calls `validate_token()` on the `JwtValidator`
5. The validator extracts the `kid` from the token header
6. The validator checks if the corresponding key is in the cache
7. If not found, it fetches the keys from Keycloak's JWKS endpoint
8. It validates the token signature and claims
9. Upon successful validation, the claims are added to the request extensions
10. The request proceeds to the handler, which can access the validated claims

## Troubleshooting

If token validation fails, check the following:

1. **Clock Synchronization**: Ensure the server's clock is synchronized, as JWT validation is time-sensitive
2. **Keycloak Configuration**: Verify that the client ID and realm settings match between Keycloak and the application
3. **Network Connectivity**: Confirm that the application can reach the Keycloak server
4. **Token Expiration**: Check if the token has expired
5. **Audience Configuration**: Ensure the audience in the token matches what the validator expects

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [JWT RFC](https://datatracker.ietf.org/doc/html/rfc7519)
- [JWK RFC](https://datatracker.ietf.org/doc/html/rfc7517)
