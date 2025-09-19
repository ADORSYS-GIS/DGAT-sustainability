use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Temp Submission table
        manager
            .create_table(
                Table::create()
                    .table(TempSubmission::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TempSubmission::TempId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(TempSubmission::OrgId).string().not_null())
                    .col(
                        ColumnDef::new(TempSubmission::Content)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TempSubmission::SubmittedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TempSubmission::Status)
                            .string()
                            .not_null()
                            .default("under_review"),
                    )
                    .col(
                        ColumnDef::new(TempSubmission::ReviewedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_temp_submission_assessment")
                            .from(TempSubmission::Table, TempSubmission::TempId)
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
            .drop_table(Table::drop().table(TempSubmission::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum TempSubmission {
    Table,
    TempId,
    OrgId,
    Content,
    SubmittedAt,
    Status,
    ReviewedAt,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}
