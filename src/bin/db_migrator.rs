use sea_orm_migration::prelude::*;

#[tokio::main]
async fn main() -> Result<(), DbErr> {
    println!("Database Migration Tool");
    println!("======================");
    
    // Load environment variables
    dotenvy::dotenv().ok();
    
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    println!("🚀 Running migrations...");
    
    let db = sea_orm::Database::connect(&database_url).await?;
    
    sustainability_tool::common::migrations::Migrator::up(&db, None).await?;
    
    println!("✅ All migrations completed successfully");
    
    Ok(())
}