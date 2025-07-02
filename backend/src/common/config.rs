use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Configs {
    pub keycloak: KeycloakConfigs,
    pub server: ServerConfigs,
}

#[derive(Debug, Clone, Deserialize)]
pub struct KeycloakConfigs {
    pub url: String,
    pub realm: String,
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfigs {
    pub host: String,
    pub port: u16,
}

impl Configs {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        let keycloak = KeycloakConfigs {
            url: env::var("KEYCLOAK_URL")?,
            realm: env::var("KEYCLOAK_REALM")?,
            client_id: env::var("KEYCLOAK_CLIENT_ID")?,
            client_secret: env::var("KEYCLOAK_CLIENT_SECRET")?,
        };

        let server = ServerConfigs {
            host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()?,
        };

        Ok(Configs { keycloak, server })
    }
}
