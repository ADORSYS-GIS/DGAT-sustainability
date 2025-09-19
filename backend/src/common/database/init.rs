use crate::common::migrations::Migrator;
use dotenv::dotenv;
use sea_orm::{Database, DatabaseConnection, DbErr};
use sea_orm_migration::prelude::*;
use std::env;
use std::sync::Arc;

/// Initialize the database connection and run migrations
///
/// This function:
/// 1. Loads environment variables from .env file
/// 2. Connects to the database using DATABASE_URL
/// 3. Runs database migrations
/// 4. Returns the database connection wrapped in Arc
pub async fn initialize_database() -> Result<Arc<DatabaseConnection>, DbErr> {
    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    // Connect to the database
    let conn = Database::connect(database_url).await?;

    // Run migrations
    println!("🚀 Running database migrations...");
    Migrator::up(&conn, None).await?;
    println!("✅ Database migrations completed successfully");

    // Return the connection wrapped in Arc for thread safety
    Ok(Arc::new(conn))
}
