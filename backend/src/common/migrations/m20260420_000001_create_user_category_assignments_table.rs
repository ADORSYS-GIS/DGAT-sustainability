use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(UserCategoryAssignments::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserCategoryAssignments::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(UserCategoryAssignments::KeycloakOrgId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserCategoryAssignments::KeycloakUserId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserCategoryAssignments::CategoryName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserCategoryAssignments::AssignedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint: one user can only be assigned a given category once per org
        manager
            .create_index(
                Index::create()
                    .name("idx_user_category_assignments_unique")
                    .table(UserCategoryAssignments::Table)
                    .col(UserCategoryAssignments::KeycloakOrgId)
                    .col(UserCategoryAssignments::KeycloakUserId)
                    .col(UserCategoryAssignments::CategoryName)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Index for fast lookup: "which categories are assigned in this org?"
        manager
            .create_index(
                Index::create()
                    .name("idx_user_category_assignments_org_category")
                    .table(UserCategoryAssignments::Table)
                    .col(UserCategoryAssignments::KeycloakOrgId)
                    .col(UserCategoryAssignments::CategoryName)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(UserCategoryAssignments::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum UserCategoryAssignments {
    Table,
    Id,
    KeycloakOrgId,
    KeycloakUserId,
    CategoryName,
    AssignedAt,
}
