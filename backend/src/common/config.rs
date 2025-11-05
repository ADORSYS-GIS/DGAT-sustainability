use envconfig::Envconfig;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize, Envconfig)]
pub struct Configs {
    #[envconfig(nested = true)]
    pub keycloak: KeycloakConfigs,
    #[envconfig(nested = true)]
    pub server: ServerConfigs,
    #[envconfig(nested = true)]
    pub cors: CorsConfigs,
}

#[derive(Debug, Clone, Deserialize, Envconfig)]
pub struct KeycloakConfigs {
    #[envconfig(from = "KEYCLOAK_URL")]
    pub url: String,
    #[envconfig(from = "KEYCLOAK_REALM")]
    pub realm: String,
    #[envconfig(from = "KEYCLOAK_CLIENT_ID")]
    pub client_id: String,
}

#[derive(Debug, Clone, Deserialize, Envconfig)]
pub struct ServerConfigs {
    #[envconfig(from = "SERVER_HOST", default = "0.0.0.0")]
    pub host: String,
    #[envconfig(from = "SERVER_PORT", default = "3001")]
    pub port: u16,
}

#[derive(Debug, Clone, Deserialize, Envconfig)]
pub struct CorsConfigs {
    #[envconfig(from = "CORS_ORIGIN", default = "http://localhost:8080")]
    pub origin: String,
}

impl Configs {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();
        Ok(Configs::init_from_env()?)
    }
}
