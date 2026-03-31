use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Questions {
    Table,
    IsActive,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .add_column(ColumnDef::new(Questions::IsActive).boolean().not_null().default(true))
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .drop_column(Questions::IsActive)
                .to_owned()
        ).await?;

        Ok(())
    }
}
