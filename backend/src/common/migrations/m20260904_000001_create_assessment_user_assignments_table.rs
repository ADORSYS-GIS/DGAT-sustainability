use sea_orm_migration::prelude::*;

/// Join table linking an assessment to the users (Org_User) it is assigned to.
/// Only assigned users may see and answer the assessment.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AssessmentUserAssignments::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AssessmentUserAssignments::AssessmentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentUserAssignments::KeycloakUserId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentUserAssignments::OrgId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentUserAssignments::AssignedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .primary_key(
                        Index::create()
                            .name("pk_assessment_user_assignments")
                            .col(AssessmentUserAssignments::AssessmentId)
                            .col(AssessmentUserAssignments::KeycloakUserId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_user_assignments_assessment")
                            .from(
                                AssessmentUserAssignments::Table,
                                AssessmentUserAssignments::AssessmentId,
                            )
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Fast lookup: which users are assigned to an assessment?
        manager
            .create_index(
                Index::create()
                    .name("idx_assessment_user_assignments_assessment")
                    .table(AssessmentUserAssignments::Table)
                    .col(AssessmentUserAssignments::AssessmentId)
                    .to_owned(),
            )
            .await?;

        // Fast lookup: which assessments are assigned to a user in an org?
        manager
            .create_index(
                Index::create()
                    .name("idx_assessment_user_assignments_user")
                    .table(AssessmentUserAssignments::Table)
                    .col(AssessmentUserAssignments::OrgId)
                    .col(AssessmentUserAssignments::KeycloakUserId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(AssessmentUserAssignments::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum AssessmentUserAssignments {
    Table,
    AssessmentId,
    KeycloakUserId,
    OrgId,
    AssignedAt,
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
}
