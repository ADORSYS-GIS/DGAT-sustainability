use sea_orm_migration::prelude::*;
use sea_orm::sea_query::{ColumnDef};
use sea_orm::Value as SeaValue;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add categories JSONB column to assessments table with default empty array
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(
                        ColumnDef::new(Assessments::Categories)
                            .json_binary()
                            .default(SeaValue::Json(Some(serde_json::Value::Array(vec![]).into())))
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the categories column during rollback
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .drop_column(Assessments::Categories)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
    OrgId,
    Language,
    Name,
    Categories, // New field for category assignment
    CreatedAt,
}