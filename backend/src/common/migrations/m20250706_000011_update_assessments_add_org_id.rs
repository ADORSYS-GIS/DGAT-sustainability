use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(ColumnDef::new(Assessments::OrgId).string().not_null())
                    .drop_column(Assessments::UserId)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(ColumnDef::new(Assessments::UserId).string().not_null())
                    .drop_column(Assessments::OrgId)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
    OrgId,
    UserId,
    Language,
    CreatedAt,
} 