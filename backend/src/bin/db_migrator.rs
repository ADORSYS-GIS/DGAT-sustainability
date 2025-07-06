use dotenv::dotenv;
use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Database, DbErr};
use std::env;
use sustainability_tool::common::migrations::Migrator;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    println!("Database Migration Tool");
    println!("======================");

    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    // Connect to the database
    let conn = Database::connect(database_url).await?;

    // Run migrations
    println!("🚀 Running migrations...");
    Migrator::up(&conn, None).await?;

    println!("✅ All migrations completed successfully");
    println!("Database setup is complete");

    Ok(())
}
