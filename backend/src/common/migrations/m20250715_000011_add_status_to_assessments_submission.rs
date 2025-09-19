use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add status column to assessments_submission table with default value "under_review"
        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .add_column(
                        ColumnDef::new(AssessmentsSubmission::Status)
                            .string()
                            .not_null()
                            .default("under_review"),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the status column
        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .drop_column(AssessmentsSubmission::Status)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    Status,
}
