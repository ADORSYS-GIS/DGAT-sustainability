use dotenv::dotenv;
use sea_orm::{Database, DatabaseConnection, DbErr};
use std::env;
use std::sync::Arc;

/// Initialize the database connection
///
/// This function:
/// 1. Loads environment variables from .env file
/// 2. Connects to the database using DATABASE_URL
/// 3. Returns the database connection wrapped in Arc
///
/// Note: This function does not run migrations. Use the db-migrator binary to run migrations.
pub async fn initialize_database() -> Result<Arc<DatabaseConnection>, DbErr> {
    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    // Connect to the database
    let conn = Database::connect(database_url).await?;

    // Return the connection wrapped in Arc for thread safety
    Ok(Arc::new(conn))
}
