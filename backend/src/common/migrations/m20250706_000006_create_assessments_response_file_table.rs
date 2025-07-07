use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Assessments Response File table (join table)
        manager
            .create_table(
                Table::create()
                    .table(AssessmentsResponseFile::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AssessmentsResponseFile::ResponseId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentsResponseFile::FileId)
                            .uuid()
                            .not_null(),
                    )
                    .primary_key(
                        Index::create()
                            .name("pk_assessment_response_file")
                            .col(AssessmentsResponseFile::ResponseId)
                            .col(AssessmentsResponseFile::FileId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_response_file_response")
                            .from(
                                AssessmentsResponseFile::Table,
                                AssessmentsResponseFile::ResponseId,
                            )
                            .to(AssessmentsResponse::Table, AssessmentsResponse::ResponseId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_response_file_file")
                            .from(
                                AssessmentsResponseFile::Table,
                                AssessmentsResponseFile::FileId,
                            )
                            .to(File::Table, File::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(AssessmentsResponseFile::Table)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum AssessmentsResponseFile {
    Table,
    ResponseId,
    FileId,
}

#[derive(Iden)]
enum AssessmentsResponse {
    Table,
    ResponseId,
}

#[derive(Iden)]
enum File {
    Table,
    Id,
}
