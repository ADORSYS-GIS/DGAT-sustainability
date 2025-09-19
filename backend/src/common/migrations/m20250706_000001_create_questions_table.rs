use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Questions table
        manager
            .create_table(
                Table::create()
                    .table(Questions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Questions::QuestionId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Questions::Category).string().not_null())
                    .col(
                        ColumnDef::new(Questions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Questions::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Questions {
    Table,
    QuestionId,
    Category,
    CreatedAt,
}
