use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add unique constraint on assessment_id, question_revision_id, and version
        // This ensures that for each question in an assessment, the version is unique
        manager
            .create_index(
                Index::create()
                    .name("idx_unique_assessment_question_version")
                    .table(AssessmentsResponse::Table)
                    .col(AssessmentsResponse::AssessmentId)
                    .col(AssessmentsResponse::QuestionRevisionId)
                    .col(AssessmentsResponse::Version)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_unique_assessment_question_version")
                    .table(AssessmentsResponse::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsResponse {
    Table,
    AssessmentId,
    QuestionRevisionId,
    Version,
}
