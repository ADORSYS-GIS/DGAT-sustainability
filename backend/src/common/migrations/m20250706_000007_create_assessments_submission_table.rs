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
                        ColumnDef::new(AssessmentsSubmission::AssessmentId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsSubmission::UserId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsSubmission::Content)
                            .json_binary()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_submission_assessment")
                            .from(
                                AssessmentsSubmission::Table,
                                AssessmentsSubmission::AssessmentId,
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
    AssessmentId,
    UserId,
    Content,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}
