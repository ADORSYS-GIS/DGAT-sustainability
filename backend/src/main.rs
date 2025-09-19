use sustainability_tool::{
    common::config::Configs,
    common::database::init::initialize_database,
    common::state::AppDatabase,
    web::routes::{create_app, AppState},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    startup().await
}

async fn startup() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Configs::new()?;

    tracing::info!("Starting Sustainability Tool backend server");

    // Initialize application database
    let app_db = initialize_app().await?;

    // Initialize application state
    let app_state = AppState::new(
        config.keycloak.url.clone(),
        config.keycloak.realm.clone(),
        app_db,
    )
    .await;

    // Create the application with all routes and middleware
    let app = create_app(app_state, config.clone());

    // Start the server
    let bind_address = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&bind_address).await?;
    tracing::info!("Server started and listening");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn initialize_app() -> Result<AppDatabase, Box<dyn std::error::Error>> {
    // Initialize database connection
    let conn = initialize_database().await?;
    tracing::info!("Database connection established successfully");

    // Initialize the application database state
    let app_db = AppDatabase::new(conn).await;
    tracing::info!("Application initialized successfully");

    Ok(app_db)
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
