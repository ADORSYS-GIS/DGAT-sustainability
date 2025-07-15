use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the foreign key constraint that causes cascade deletion
        // This allows submissions to persist after assessments are deleted
        manager
            .drop_foreign_key(
                ForeignKey::drop()
                    .name("fk_assessment_submission_assessment")
                    .table(AssessmentsSubmission::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Re-add the foreign key constraint if we need to rollback
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_assessment_submission_assessment")
                    .from(
                        AssessmentsSubmission::Table,
                        AssessmentsSubmission::SubmissionId,
                    )
                    .to(Assessments::Table, Assessments::AssessmentId)
                    .on_delete(ForeignKeyAction::Cascade)
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

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}