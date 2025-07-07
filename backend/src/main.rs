use sustainability_tool::{
    common::config::Configs,
    web::routes::{create_app, AppState},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Configs::new()?;

    tracing::info!("Starting Sustainability Tool backend server...");
    tracing::info!("Keycloak URL: {}", config.keycloak.url);
    tracing::info!("Keycloak Realm: {}", config.keycloak.realm);
    tracing::info!(
        "Server will listen on {}:{}",
        config.server.host,
        config.server.port
    );

    // Initialize application state
    let app_state = AppState::new(config.keycloak.url, config.keycloak.realm);

    // Create the application with all routes and middleware
    let app = create_app(app_state);

    // Start the server
    let bind_address = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&bind_address).await?;

    tracing::info!("🚀 Server started successfully on http://{}", bind_address);
    tracing::info!(
        "📋 Health check available at: http://{}/health",
        bind_address
    );
    tracing::info!(
        "🔐 API endpoints available at: http://{}/api/v1",
        bind_address
    );

    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
