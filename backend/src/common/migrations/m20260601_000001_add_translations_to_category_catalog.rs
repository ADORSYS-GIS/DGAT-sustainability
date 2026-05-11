use sea_orm_migration::prelude::*;
use sea_orm::Value as SeaValue;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(CategoryCatalog::Table)
                    .add_column(
                        ColumnDef::new(CategoryCatalog::NameTranslations)
                            .json_binary()
                            .default(SeaValue::Json(Some(serde_json::json!({}).into())))
                            .not_null(),
                    )
                    .add_column(
                        ColumnDef::new(CategoryCatalog::DescriptionTranslations)
                            .json_binary()
                            .default(SeaValue::Json(Some(serde_json::json!({}).into())))
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(CategoryCatalog::Table)
                    .drop_column(CategoryCatalog::NameTranslations)
                    .drop_column(CategoryCatalog::DescriptionTranslations)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum CategoryCatalog {
    Table,
    NameTranslations,
    DescriptionTranslations,
}
