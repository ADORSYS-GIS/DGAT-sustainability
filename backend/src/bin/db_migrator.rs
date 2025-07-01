use dotenv::dotenv;
use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Database, DatabaseConnection, DbErr, Statement};
use std::env;
use std::sync::Arc;
use sustainability_tool::common::migrations::Migration;

/// Check if migrations have already been applied by checking for the existence of key tables
async fn check_migrations_exist(conn: &DatabaseConnection) -> Result<bool, DbErr> {
    // Check if the main tables exist by querying information_schema
    let sql = "SELECT COUNT(*) as table_count FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name IN ('organization_categories', 'questions', 'assessments', 'sync_queue', 'reports')";

    let statement = Statement::from_string(conn.get_database_backend(), sql);
    let result = conn.query_one(statement).await?;

    if let Some(row) = result {
        let count: i64 = row.try_get("", "table_count")?;
        // If we have all 5 main tables, migrations have been applied
        Ok(count == 5)
    } else {
        Ok(false)
    }
}

/// Initialize the database connection and run migrations
///
/// This function:
/// 1. Loads environment variables from .env file
/// 2. Connects to the database using DATABASE_URL
/// 3. Runs all migrations
/// 4. Returns the database connection wrapped in Arc
async fn initialize_database() -> Result<Arc<DatabaseConnection>, DbErr> {
    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    // Connect to the database
    let conn = Database::connect(database_url).await?;

    // Check if migrations have already been applied
    println!("Checking if migrations have already been applied...");

    if check_migrations_exist(&conn).await? {
        println!("✓ Migrations already exist!");
        println!("All required database tables are already present.");
        println!("Database is ready for use.");
        return Ok(Arc::new(conn));
    }

    // Create a schema manager
    let schema_manager = SchemaManager::new(&conn);

    // Run migrations
    println!("Running database migrations...");

    // Run the comprehensive migration (creates enums, tables, and indexes)
    Migration.up(&schema_manager).await?;
    println!("Migration completed successfully");

    println!("All migrations completed successfully");

    // Return the connection wrapped in Arc for thread safety
    Ok(Arc::new(conn))
}

#[tokio::main]
async fn main() {
    println!("Database Migration Tool");
    println!("======================");
    println!("This tool will connect to the database and run all migrations if they haven't been applied yet.");

    // Initialize database and run migrations
    match initialize_database().await {
        Ok(_) => {
            println!("Database connection established and migrations completed successfully");
            println!("Database setup is complete");
        }
        Err(err) => {
            eprintln!("Failed to initialize database: {}", err);
            std::process::exit(1);
        }
    }
}
