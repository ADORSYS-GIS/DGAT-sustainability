use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Assessments Response table
        manager
            .create_table(
                Table::create()
                    .table(AssessmentsResponse::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AssessmentsResponse::ResponseId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponse::AssessmentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponse::QuestionRevisionId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponse::Response)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponse::Version)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponse::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_response_assessment")
                            .from(
                                AssessmentsResponse::Table,
                                AssessmentsResponse::AssessmentId,
                            )
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_response_question_revision")
                            .from(
                                AssessmentsResponse::Table,
                                AssessmentsResponse::QuestionRevisionId,
                            )
                            .to(
                                QuestionsRevisions::Table,
                                QuestionsRevisions::QuestionRevisionId,
                            ),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AssessmentsResponse::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsResponse {
    Table,
    ResponseId,
    AssessmentId,
    QuestionRevisionId,
    Response,
    Version,
    UpdatedAt,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}

#[derive(Iden)]
enum QuestionsRevisions {
    Table,
    QuestionRevisionId,
}
