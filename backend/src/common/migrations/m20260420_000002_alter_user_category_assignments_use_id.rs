use sea_orm_migration::prelude::*;
use uuid::Uuid;

/// Replaces the `category_name` VARCHAR column with `category_catalog_id` UUID.
/// Names are fragile (casing, typos); the UUID from category_catalog is the stable key.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the old name-based column and add the UUID column
        manager
            .alter_table(
                Table::alter()
                    .table(UserCategoryAssignments::Table)
                    .drop_column(UserCategoryAssignments::CategoryName)
                    .add_column(
                        ColumnDef::new(UserCategoryAssignments::CategoryCatalogId)
                            .uuid()
                            .not_null()
                            .default(Uuid::nil()),
                    )
                    .to_owned(),
            )
            .await?;

        // Clear all stale rows — they were written with category names (strings) and now
        // have nil UUIDs as placeholders. They will be re-synced from Keycloak on next request.
        manager
            .get_connection()
            .execute_unprepared("DELETE FROM user_category_assignments")
            .await?;

        // Replace the unique index with one on the new column
        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_category_assignments_unique")
                    .table(UserCategoryAssignments::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_category_assignments_org_category")
                    .table(UserCategoryAssignments::Table)
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_category_assignments_unique")
                    .table(UserCategoryAssignments::Table)
                    .col(UserCategoryAssignments::KeycloakOrgId)
                    .col(UserCategoryAssignments::KeycloakUserId)
                    .col(UserCategoryAssignments::CategoryCatalogId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_user_category_assignments_org_category")
                    .table(UserCategoryAssignments::Table)
                    .col(UserCategoryAssignments::KeycloakOrgId)
                    .col(UserCategoryAssignments::CategoryCatalogId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(UserCategoryAssignments::Table)
                    .drop_column(UserCategoryAssignments::CategoryCatalogId)
                    .add_column(
                        ColumnDef::new(UserCategoryAssignments::CategoryName)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum UserCategoryAssignments {
    Table,
    KeycloakOrgId,
    KeycloakUserId,
    CategoryName,
    CategoryCatalogId,
}
