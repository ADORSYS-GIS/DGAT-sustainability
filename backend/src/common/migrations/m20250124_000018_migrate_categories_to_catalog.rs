use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Migrate existing categories to category_catalog
        let db = manager.get_connection();
        
        // Insert all existing categories into category_catalog
        db.execute_unprepared(
            "INSERT INTO category_catalog (category_catalog_id, name, description, template_id, is_active, created_at, updated_at)
             SELECT category_id, name, NULL, template_id, true, created_at, updated_at
             FROM categories"
        ).await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // This migration is not easily reversible as we're moving data
        // In a real scenario, you might want to backup the data first
        tracing::warn!("Migration down not implemented - data migration is not easily reversible");
        Ok(())
    }
}
