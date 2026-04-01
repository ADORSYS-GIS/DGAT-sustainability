use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[derive(DeriveIden)]
enum Questions {
    Table,
    DisplayOrder,
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .add_column(ColumnDef::new(Questions::DisplayOrder).integer().not_null().default(0))
                .to_owned()
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.alter_table(
            Table::alter()
                .table(Questions::Table)
                .drop_column(Questions::DisplayOrder)
                .to_owned()
        ).await?;

        Ok(())
    }
}
