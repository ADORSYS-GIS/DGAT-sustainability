use sea_orm_migration::prelude::extension::postgres::Type;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create custom enum types first
        self.create_enums(manager).await?;

        // Create tables
        self.create_organization_categories_table(manager).await?;
        self.create_questions_table(manager).await?;
        self.create_assessments_table(manager).await?;
        self.create_sync_queue_table(manager).await?;
        self.create_reports_table(manager).await?;

        // Create indexes
        self.create_indexes(manager).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order (respecting foreign key constraints)
        manager
            .drop_table(Table::drop().table(Reports::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(SyncQueue::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Assessments::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Questions::Table).to_owned())
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table(OrganizationCategories::Table)
                    .to_owned(),
            )
            .await?;

        // Drop custom types
        manager
            .drop_type(Type::drop().name(SyncStatusEnum::Enum).to_owned())
            .await?;

        Ok(())
    }
}

impl Migration {
    async fn create_enums(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
        // Sync Status Enum
        manager
            .create_type(
                Type::create()
                    .as_enum(SyncStatusEnum::Enum)
                    .values([
                        SyncStatusEnum::Pending,
                        SyncStatusEnum::Processing,
                        SyncStatusEnum::Completed,
                    ])
                    .to_owned(),
            )
            .await?;

        // Report Type Enum

        Ok(())
    }

    async fn create_organization_categories_table(
        &self,
        manager: &SchemaManager<'_>,
    ) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(OrganizationCategories::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OrganizationCategories::CategoryId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::Name)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OrganizationCategories::Description).string())
                    .col(
                        ColumnDef::new(OrganizationCategories::Categories)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OrganizationCategories::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn create_questions_table(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
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
                    .col(ColumnDef::new(Questions::Text).json_binary().not_null())
                    .col(ColumnDef::new(Questions::CategoryId).uuid().not_null())
                    .col(ColumnDef::new(Questions::Weight).float().not_null())
                    .col(
                        ColumnDef::new(Questions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Questions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_questions_category")
                            .from(Questions::Table, Questions::CategoryId)
                            .to(
                                OrganizationCategories::Table,
                                OrganizationCategories::CategoryId,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn create_assessments_table(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
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
                    .col(ColumnDef::new(Assessments::UserId).string().not_null())
                    .col(ColumnDef::new(Assessments::Data).json_binary().not_null())
                    .col(
                        ColumnDef::new(Assessments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Assessments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn create_sync_queue_table(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SyncQueue::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncQueue::SyncId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(SyncQueue::UserId).string().not_null())
                    .col(ColumnDef::new(SyncQueue::AssessmentId).uuid().not_null())
                    .col(ColumnDef::new(SyncQueue::Data).json_binary().not_null())
                    .col(
                        ColumnDef::new(SyncQueue::Status)
                            .custom(SyncStatusEnum::Enum)
                            .not_null()
                            .default(SimpleExpr::Custom(format!("'{}'", "pending"))),
                    )
                    .col(
                        ColumnDef::new(SyncQueue::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SyncQueue::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sync_queue_assessment")
                            .from(SyncQueue::Table, SyncQueue::AssessmentId)
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn create_reports_table(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Reports::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Reports::ReportId)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Reports::AssessmentId).uuid().not_null())
                    .col(ColumnDef::new(Reports::Data).json_binary().not_null())
                    .col(
                        ColumnDef::new(Reports::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Reports::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reports_assessment")
                            .from(Reports::Table, Reports::AssessmentId)
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn create_indexes(&self, manager: &SchemaManager<'_>) -> Result<(), DbErr> {
        // Regular indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_assessments_user_id")
                    .table(Assessments::Table)
                    .col(Assessments::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_questions_category_id")
                    .table(Questions::Table)
                    .col(Questions::CategoryId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sync_queue_user_id")
                    .table(SyncQueue::Table)
                    .col(SyncQueue::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sync_queue_assessment_id")
                    .table(SyncQueue::Table)
                    .col(SyncQueue::AssessmentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_reports_assessment_id")
                    .table(Reports::Table)
                    .col(Reports::AssessmentId)
                    .to_owned(),
            )
            .await?;

        // GIN indexes for JSONB fields
        manager
            .create_index(
                Index::create()
                    .name("idx_assessments_data_gin")
                    .table(Assessments::Table)
                    .col(Assessments::Data)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_questions_text_gin")
                    .table(Questions::Table)
                    .col(Questions::Text)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sync_queue_data_gin")
                    .table(SyncQueue::Table)
                    .col(SyncQueue::Data)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_reports_data_gin")
                    .table(Reports::Table)
                    .col(Reports::Data)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_organization_categories_gin")
                    .table(OrganizationCategories::Table)
                    .col(OrganizationCategories::Categories)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

// Table and column definitions
#[derive(DeriveIden)]
enum OrganizationCategories {
    Table,
    CategoryId,
    Name,
    Description,
    Categories,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Questions {
    Table,
    QuestionId,
    Text,
    CategoryId,
    Weight,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Assessments {
    Table,
    AssessmentId,
    UserId,
    Data,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum SyncQueue {
    Table,
    SyncId,
    UserId,
    AssessmentId,
    Data,
    Status,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Reports {
    Table,
    ReportId,
    AssessmentId,
    Data,
    CreatedAt,
    UpdatedAt,
}
#[derive(DeriveIden)]
pub enum SyncStatusEnum {
    Enum,
    Pending,
    Processing,
    Completed,
}
