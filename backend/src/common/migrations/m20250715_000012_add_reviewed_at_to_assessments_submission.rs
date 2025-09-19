use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add reviewed_at column to assessments_submission table as nullable timestamp
        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .add_column(
                        ColumnDef::new(AssessmentsSubmission::ReviewedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the reviewed_at column
        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .drop_column(AssessmentsSubmission::ReviewedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    ReviewedAt,
}
