use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // First, remove any duplicate reports keeping only the latest one for each submission
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DELETE FROM submission_reports 
                WHERE report_id NOT IN (
                    SELECT DISTINCT ON (submission_id) report_id 
                    FROM submission_reports 
                    ORDER BY submission_id, generated_at DESC
                )
                "#,
            )
            .await?;

        // Add unique constraint on submission_id to prevent future duplicates
        manager
            .create_index(
                Index::create()
                    .name("idx_submission_reports_submission_id_unique")
                    .table(SubmissionReports::Table)
                    .col(SubmissionReports::SubmissionId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the unique constraint
        manager
            .drop_index(
                Index::drop()
                    .name("idx_submission_reports_submission_id_unique")
                    .table(SubmissionReports::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum SubmissionReports {
    Table,
    SubmissionId,
}