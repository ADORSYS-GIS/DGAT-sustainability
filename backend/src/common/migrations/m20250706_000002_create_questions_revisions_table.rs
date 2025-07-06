use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Question Revisions table
        manager
            .create_table(
                Table::create()
                    .table(QuestionsRevisions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(QuestionsRevisions::QuestionRevisionId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(QuestionsRevisions::QuestionId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(QuestionsRevisions::Text)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(QuestionsRevisions::Weight)
                            .float()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(QuestionsRevisions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_question_revisions_question")
                            .from(QuestionsRevisions::Table, QuestionsRevisions::QuestionId)
                            .to(Questions::Table, Questions::QuestionId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(QuestionsRevisions::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum QuestionsRevisions {
    Table,
    QuestionRevisionId,
    QuestionId,
    Text,
    Weight,
    CreatedAt,
}

#[derive(Iden)]
enum Questions {
    Table,
    QuestionId,
}
