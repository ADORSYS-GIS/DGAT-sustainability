use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // First, remove any existing duplicates before adding the unique constraint
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DELETE FROM assessments_submission 
                WHERE submission_id IN (
                    SELECT submission_id 
                    FROM (
                        SELECT submission_id,
                               ROW_NUMBER() OVER (PARTITION BY submission_id ORDER BY submitted_at DESC) as rn
                        FROM assessments_submission
                    ) t 
                    WHERE t.rn > 1
                )
                "#,
            )
            .await?;

        // Add unique constraint on submission_id to prevent duplicates
        manager
            .create_index(
                Index::create()
                    .name("idx_assessments_submission_unique_submission_id")
                    .table(AssessmentsSubmission::Table)
                    .col(AssessmentsSubmission::SubmissionId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the unique constraint
        manager
            .drop_index(
                Index::drop()
                    .name("idx_assessments_submission_unique_submission_id")
                    .table(AssessmentsSubmission::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    SubmissionId,
}