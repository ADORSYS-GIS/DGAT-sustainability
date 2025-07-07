use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // File table
        manager
            .create_table(
                Table::create()
                    .table(File::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(File::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(File::Content).binary().not_null())
                    .col(ColumnDef::new(File::Metadata).json_binary().not_null())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(File::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum File {
    Table,
    Id,
    Content,
    Metadata,
}
