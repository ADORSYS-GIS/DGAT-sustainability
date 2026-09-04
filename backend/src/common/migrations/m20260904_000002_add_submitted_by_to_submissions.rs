use sea_orm_migration::prelude::*;

/// Adds `submitted_by` (keycloak user id) to `assessments_submission` and
/// `temp_submission` so submissions can be scoped to the user who submitted them.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .add_column(
                        ColumnDef::new(AssessmentsSubmission::SubmittedBy)
                            .string()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(TempSubmission::Table)
                    .add_column(
                        ColumnDef::new(TempSubmission::SubmittedBy)
                            .string()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Index for fast per-user submission lookup
        manager
            .create_index(
                Index::create()
                    .name("idx_assessments_submission_submitted_by")
                    .table(AssessmentsSubmission::Table)
                    .col(AssessmentsSubmission::SubmittedBy)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_temp_submission_submitted_by")
                    .table(TempSubmission::Table)
                    .col(TempSubmission::SubmittedBy)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_assessments_submission_submitted_by")
                    .table(AssessmentsSubmission::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_temp_submission_submitted_by")
                    .table(TempSubmission::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(AssessmentsSubmission::Table)
                    .drop_column(AssessmentsSubmission::SubmittedBy)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(TempSubmission::Table)
                    .drop_column(TempSubmission::SubmittedBy)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum AssessmentsSubmission {
    Table,
    SubmittedBy,
}

#[derive(Iden)]
enum TempSubmission {
    Table,
    SubmittedBy,
}
