use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add name column to assessments table
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(
                        ColumnDef::new(Assessments::Name)
                            .string()
                            .not_null()
                            .default("Untitled Assessment"),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove name column from assessments table
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .drop_column(Assessments::Name)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    Name,
} 