use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Rename assessment_id to submission_id
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .rename_column(SubmissionReports::AssessmentId, SubmissionReports::SubmissionId)
                    .to_owned(),
            )
            .await?;

        // Add report_type column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .add_column(
                        ColumnDef::new(SubmissionReports::ReportType)
                            .string()
                            .not_null()
                            .default("summary")
                    )
                    .to_owned(),
            )
            .await?;

        // Add status column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .add_column(
                        ColumnDef::new(SubmissionReports::Status)
                            .string()
                            .not_null()
                            .default("completed")
                    )
                    .to_owned(),
            )
            .await?;

        // Add generated_at column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .add_column(
                        ColumnDef::new(SubmissionReports::GeneratedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp())
                    )
                    .to_owned(),
            )
            .await?;

        // Make data column nullable
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .modify_column(
                        ColumnDef::new(SubmissionReports::Data)
                            .json_binary()
                            .null()
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Revert data column to not null
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .modify_column(
                        ColumnDef::new(SubmissionReports::Data)
                            .json_binary()
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        // Remove generated_at column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .drop_column(SubmissionReports::GeneratedAt)
                    .to_owned(),
            )
            .await?;

        // Remove status column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .drop_column(SubmissionReports::Status)
                    .to_owned(),
            )
            .await?;

        // Remove report_type column
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .drop_column(SubmissionReports::ReportType)
                    .to_owned(),
            )
            .await?;

        // Rename submission_id back to assessment_id
        manager
            .alter_table(
                Table::alter()
                    .table(SubmissionReports::Table)
                    .rename_column(SubmissionReports::SubmissionId, SubmissionReports::AssessmentId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum SubmissionReports {
    Table,
    AssessmentId,
    SubmissionId,
    ReportType,
    Status,
    GeneratedAt,
    Data,
}