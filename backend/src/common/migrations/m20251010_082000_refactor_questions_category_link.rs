use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Questions {
    Table,
    CategoryId,
    Category,
}

#[derive(DeriveIden)]
enum CategoryCatalog {
    Table,
    CategoryCatalogId,
    Name,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add the new category_id column, nullable for now to allow populating it.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .add_column(ColumnDef::new(Questions::CategoryId).uuid())
                .to_owned()
        ).await?;

        // 2. Ensure a default "Uncategorized" category exists.
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            INSERT INTO category_catalog (category_catalog_id, name, description, template_id, is_active, created_at, updated_at)
            VALUES ('00000000-0000-0000-0000-000000000000', 'Uncategorized', 'Default category for questions without a specific category', 'default', true, NOW(), NOW())
            ON CONFLICT (category_catalog_id) DO NOTHING;
            "#
        ).await?;

        // 3. Set a default category_id for all questions first.
        db.execute_unprepared(
            "UPDATE questions SET category_id = '00000000-0000-0000-0000-000000000000'"
        ).await?;

        // 4. Populate the new category_id column from the existing category name where matches are found.
        db.execute_unprepared(
            "UPDATE questions SET category_id = category_catalog.category_catalog_id
             FROM category_catalog WHERE questions.category = category_catalog.name"
        ).await?;

        // 5. Now that it's populated, alter the column to be NOT NULL.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .modify_column(ColumnDef::new(Questions::CategoryId).uuid().not_null())
                .to_owned()
        ).await?;

        // 6. Add the foreign key constraint to enforce the relationship.
        manager.create_foreign_key(
            ForeignKey::create()
                .name("fk_questions_category_id")
                .from(Questions::Table, Questions::CategoryId)
                .to(CategoryCatalog::Table, CategoryCatalog::CategoryCatalogId)
                .on_delete(ForeignKeyAction::Restrict) // Prevent deleting a category if questions are linked
                .on_update(ForeignKeyAction::Cascade)
                .to_owned()
        ).await?;

        // 7. Drop the old, redundant `category` column.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .drop_column(Questions::Category)
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add the old `category` column back, nullable for now.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .add_column(ColumnDef::new(Questions::Category).string())
                .to_owned()
        ).await?;

        // 2. Populate the `category` column from the `category_id`.
        let db = manager.get_connection();
        db.execute_unprepared(
            "UPDATE questions SET category = category_catalog.name
             FROM category_catalog WHERE questions.category_id = category_catalog.category_catalog_id"
        ).await?;
        
        // 3. Make the `category` column NOT NULL.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .modify_column(ColumnDef::new(Questions::Category).string().not_null())
                .to_owned()
        ).await?;

        // 4. Drop the foreign key.
        manager.drop_foreign_key(
            ForeignKey::drop()
                .name("fk_questions_category_id")
                .table(Questions::Table)
                .to_owned()
        ).await?;

        // 5. Drop the `category_id` column.
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .drop_column(Questions::CategoryId)
                .to_owned()
        ).await?;

        Ok(())
    }
}