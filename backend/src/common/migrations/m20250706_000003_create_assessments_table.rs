use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::sea_query::Iden;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Assessment table
        manager
            .create_table(
                Table::create()
                    .table(Assessments::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Assessments::AssessmentId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Assessments::OrgId).string().not_null())
                    .col(ColumnDef::new(Assessments::Language).string().not_null())
                    .col(
                        ColumnDef::new(Assessments::CreatedAt)
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
            .drop_table(Table::drop().table(Assessments::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
    OrgId,
    Language,
    CreatedAt,
}
