use dotenv::dotenv;
use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{Database, DatabaseConnection, DbErr};
use std::env;
use std::sync::Arc;
use sustainability_tool::common::migration_tracker::{MigrationStatus, MigrationTracker};
use sustainability_tool::common::migrations::Migration;

/// Check if migrations have already been applied using the migration tracker
async fn check_migrations_completed(
    tracker: &MigrationTracker,
    migration_name: &str,
) -> Result<bool, DbErr> {
    tracker.is_migration_completed(migration_name).await
}

/// Perform rollback for a failed migration
async fn rollback_migration(tracker: &MigrationTracker, migration_name: &str) -> Result<(), DbErr> {
    println!("🔄 Rolling back migration: {}", migration_name);

    // Create schema manager for rollback
    let schema_manager = SchemaManager::new(tracker.get_connection());

    // Execute the rollback
    match Migration.down(&schema_manager).await {
        Ok(_) => {
            tracker.rollback_migration(migration_name).await?;
            println!("✅ Migration rollback completed successfully");
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Rollback failed: {}", e);
            tracker.fail_migration(migration_name, &error_msg).await?;
            println!("❌ Migration rollback failed: {}", e);
            Err(e)
        }
    }
}

/// Initialize the database connection and run migrations with proper tracking and rollback support
///
/// This function:
/// 1. Loads environment variables from .env file
/// 2. Connects to the database using DATABASE_URL
/// 3. Initializes migration tracking system
/// 4. Checks for failed migrations and handles rollbacks
/// 5. Runs migrations with proper error handling
/// 6. Returns the database connection wrapped in Arc
async fn initialize_database() -> Result<Arc<DatabaseConnection>, DbErr> {
    // Load environment variables from .env file
    dotenv().ok();

    // Get database URL from environment
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    // Connect to the database
    let conn = Database::connect(database_url).await?;
    let conn_arc = Arc::new(conn);

    // Initialize migration tracker
    let tracker = MigrationTracker::new(conn_arc.clone());
    tracker.initialize().await?;

    let migration_name = "initial_schema_v1";

    // Check for failed migrations that need rollback
    println!("🔍 Checking migration status...");

    if tracker.has_failed_migrations().await? {
        println!("⚠️  Found failed migrations. Attempting rollback...");
        rollback_migration(&tracker, migration_name).await?;
    }

    // Check if migrations have already been completed
    if check_migrations_completed(&tracker, migration_name).await? {
        println!("✅ Migration '{}' already completed!", migration_name);
        println!("All required database tables are already present.");
        println!("Database is ready for use.");
        return Ok(conn_arc);
    }

    // Check current migration status
    match tracker.get_migration_status(migration_name).await? {
        Some(MigrationStatus::Running) => {
            println!(
                "⚠️  Migration '{}' was interrupted. Rolling back...",
                migration_name
            );
            rollback_migration(&tracker, migration_name).await?;
        }
        Some(MigrationStatus::Failed) => {
            println!(
                "⚠️  Migration '{}' previously failed. Rolling back...",
                migration_name
            );
            rollback_migration(&tracker, migration_name).await?;
        }
        _ => {}
    }

    // Start migration with tracking
    println!("🚀 Starting migration: {}", migration_name);
    tracker.start_migration(migration_name).await?;

    // Create a schema manager
    let schema_manager = SchemaManager::new(tracker.get_connection());

    // Run migrations with error handling and rollback support
    match Migration.up(&schema_manager).await {
        Ok(_) => {
            // Mark migration as completed
            tracker.complete_migration(migration_name).await?;
            println!("✅ Migration '{}' completed successfully", migration_name);
        }
        Err(e) => {
            // Mark migration as failed and attempt rollback
            let error_msg = format!("Migration failed: {}", e);
            tracker.fail_migration(migration_name, &error_msg).await?;
            println!("❌ Migration '{}' failed: {}", migration_name, e);

            // Attempt rollback
            println!("🔄 Attempting automatic rollback...");
            if let Err(rollback_err) = rollback_migration(&tracker, migration_name).await {
                println!("❌ Rollback also failed: {}", rollback_err);
                return Err(DbErr::Custom(format!(
                    "Migration failed and rollback failed. Original error: {}. Rollback error: {}",
                    e, rollback_err
                )));
            }

            return Err(e);
        }
    }

    println!("🎉 All migrations completed successfully");

    // Return the connection wrapped in Arc for thread safety
    Ok(conn_arc)
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
