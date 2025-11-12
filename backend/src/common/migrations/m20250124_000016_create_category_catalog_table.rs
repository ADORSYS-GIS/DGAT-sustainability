use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CategoryCatalog::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CategoryCatalog::CategoryCatalogId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(CategoryCatalog::Name).string().not_null())
                    .col(ColumnDef::new(CategoryCatalog::Description).string())
                    .col(ColumnDef::new(CategoryCatalog::TemplateId).string().not_null())
                    .col(ColumnDef::new(CategoryCatalog::IsActive).boolean().not_null().default(true))
                    .col(
                        ColumnDef::new(CategoryCatalog::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CategoryCatalog::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CategoryCatalog::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum CategoryCatalog {
    Table,
    CategoryCatalogId,
    Name,
    Description,
    TemplateId,
    IsActive,
    CreatedAt,
    UpdatedAt,
}
