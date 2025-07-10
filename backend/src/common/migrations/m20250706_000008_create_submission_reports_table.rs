use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Submission Reports table
        manager
            .create_table(
                Table::create()
                    .table(SubmissionReports::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SubmissionReports::ReportId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SubmissionReports::AssessmentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SubmissionReports::Data)
                            .json_binary()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_submission_report_assessment_submission")
                            .from(SubmissionReports::Table, SubmissionReports::AssessmentId)
                            .to(
                                AssessmentsSubmission::Table,
                                AssessmentsSubmission::AssessmentId,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SubmissionReports::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum SubmissionReports {
    Table,
    ReportId,
    AssessmentId,
    Data,
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    AssessmentId,
}
