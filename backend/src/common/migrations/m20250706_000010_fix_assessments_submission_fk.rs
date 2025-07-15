use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the existing foreign key constraint with CASCADE DELETE
        // This allows us to delete assessments after creating submissions
        // without the database automatically cascading the delete
        manager
            .drop_foreign_key(
                ForeignKey::drop()
                    .name("fk_assessment_submission_assessment")
                    .table(AssessmentsSubmission::Table)
                    .to_owned(),
            )
            .await?;

        // Don't recreate the foreign key constraint
        // This allows the application to control the relationship manually
        // and enables the transaction logic to work properly

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Recreate the original CASCADE DELETE foreign key constraint
        // This reverts the migration back to the original state
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_assessment_submission_assessment")
                    .from(
                        AssessmentsSubmission::Table,
                        AssessmentsSubmission::AssessmentId,
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
    AssessmentId,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}
