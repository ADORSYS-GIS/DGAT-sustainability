use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Assessments Submission table
        manager
            .create_table(
                Table::create()
                    .table(AssessmentsSubmission::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AssessmentsSubmission::SubmissionId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsSubmission::OrgId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsSubmission::Content)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsSubmission::SubmittedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_submission_assessment")
                            .from(
                                AssessmentsSubmission::Table,
                                AssessmentsSubmission::SubmissionId,
                            )
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AssessmentsSubmission::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    SubmissionId,
    OrgId,
    Content,
    SubmittedAt,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}
