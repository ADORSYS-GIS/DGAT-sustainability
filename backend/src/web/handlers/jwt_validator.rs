use crate::common::models::claims::Claims;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use thiserror::Error;
use tracing::{error};

#[derive(Error, Debug)]
pub enum JwtError {
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    #[error("Keycloak error: {0}")]
    KeycloakError(String),
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    #[error("JWT decode error: {0}")]
    DecodeError(#[from] jsonwebtoken::errors::Error),
}

#[derive(Clone)]
pub struct JwtValidator {
    client: Client,
    keycloak_url: String,
    realm: String,
    keys_cache: HashMap<String, DecodingKey>,
}

impl JwtValidator {
    pub fn new(keycloak_url: String, realm: String) -> Self {
        Self {
            client: Client::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .expect("Client"),
            keycloak_url,
            realm,
            keys_cache: HashMap::new(),
        }
    }

    pub async fn validate_token(&mut self, token: &str) -> Result<Claims, JwtError> {
        // Decode header to get key ID
        let header = decode_header(token).map_err(|e| JwtError::InvalidToken(e.to_string()))?;

        let kid = header
            .kid
            .ok_or_else(|| JwtError::InvalidToken("No key ID in token header".to_string()))?;

        // Get or fetch the decoding key
        let decoding_key = self.get_decoding_key(&kid).await?;

        // Set up validation
        let mut validation = Validation::new(Algorithm::RS256);
        // Accept the frontend/client audience and account
        // NOTE: Align these with your Keycloak client-id(s)
        validation.set_audience(&["sustainability-tool", "account"]);
        // Accept the exact HTTPS issuer (matches well-known), and be lenient by also allowing HTTP if present upstream
        let https_iss = format!("{}/realms/{}", self.keycloak_url, self.realm);
        let http_iss = https_iss.replace("https://", "http://");
        validation.set_issuer(&[&https_iss, &http_iss]);
        // Decode and validate token
        let token_data =
            decode::<Claims>(token, &decoding_key, &validation).map_err(JwtError::DecodeError)?;

        Ok(token_data.claims)
    }

    async fn get_decoding_key(&mut self, kid: &str) -> Result<DecodingKey, JwtError> {
        // Check cache first
        if let Some(key) = self.keys_cache.get(kid) {
            return Ok(key.clone());
        }

        // Fetch from Keycloak
        let keys = self.fetch_public_keys().await?;

        // Find the key with matching kid
        let key_data = keys
            .iter()
            .find(|key| key["kid"].as_str() == Some(kid))
            .ok_or_else(|| JwtError::InvalidToken("Key not found".to_string()))?;

        // Create a decoding key
        let n = key_data["n"]
            .as_str()
            .ok_or_else(|| JwtError::InvalidToken("Invalid key format".to_string()))?;
        let e = key_data["e"]
            .as_str()
            .ok_or_else(|| JwtError::InvalidToken("Invalid key format".to_string()))?;

        let decoding_key = DecodingKey::from_rsa_components(n, e)
            .map_err(|e| JwtError::InvalidToken(e.to_string()))?;

        // Cache the key
        self.keys_cache
            .insert(kid.to_string(), decoding_key.clone());

        Ok(decoding_key)
    }

    async fn fetch_public_keys(&self) -> Result<Vec<Value>, JwtError> {
        let certs_url = format!(
            "{}/realms/{}/protocol/openid-connect/certs",
            self.keycloak_url, self.realm
        );

        let response = self.client.get(&certs_url).send().await?;
        let jwks: Value = response.json().await?;

        let keys = jwks["keys"]
            .as_array()
            .ok_or_else(|| JwtError::KeycloakError("Invalid JWKS format".to_string()))?;

        Ok(keys.clone())
    }
}
