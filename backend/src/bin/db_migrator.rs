use dotenv::dotenv;
use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Database, DbErr};
use std::env;
use sustainability_tool::common::migrations::Migrator;
use anyhow::{Context, Result};
use tracing::{info, error};
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_env_filter("info")
        .init();

    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .context("DATABASE_URL must be set in environment or .env")?;

    let conn = Database::connect(&database_url)
        .await
        .with_context(|| format!("Failed to connect to database at {}", &database_url))?;

    info!("Running database migrations");
    if let Err(e) = Migrator::up(&conn, None).await {
        error!("Database migration failed: {:?}", e);
        return Err(e.into());
    }

    info!("All database migrations completed successfully");

    Ok(())
}
