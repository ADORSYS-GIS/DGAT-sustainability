use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("assessments_submission"))
                    .add_column(
                        ColumnDef::new(Alias::new("org_name"))
                            .string()
                            .not_null()
                            .default("Unknown Organization"),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("assessments_submission"))
                    .drop_column(Alias::new("org_name"))
                    .to_owned(),
            )
            .await
    }
}