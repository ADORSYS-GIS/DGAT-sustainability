use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(OrganizationCategories::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OrganizationCategories::OrganizationCategoryId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::KeycloakOrganizationId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::CategoryCatalogId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OrganizationCategories::Weight).integer().not_null())
                    .col(ColumnDef::new(OrganizationCategories::Order).integer().not_null())
                    .col(
                        ColumnDef::new(OrganizationCategories::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_organization_categories_category_catalog_id")
                            .from(OrganizationCategories::Table, OrganizationCategories::CategoryCatalogId)
                            .to(CategoryCatalog::Table, CategoryCatalog::CategoryCatalogId)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique constraint to prevent duplicate category assignments per organization
        manager
            .create_index(
                Index::create()
                    .name("idx_organization_categories_unique")
                    .table(OrganizationCategories::Table)
                    .col(OrganizationCategories::KeycloakOrganizationId)
                    .col(OrganizationCategories::CategoryCatalogId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(OrganizationCategories::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum OrganizationCategories {
    Table,
    OrganizationCategoryId,
    KeycloakOrganizationId,
    CategoryCatalogId,
    Weight,
    Order,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum CategoryCatalog {
    Table,
    CategoryCatalogId,
}
