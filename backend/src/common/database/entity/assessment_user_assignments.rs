use crate::impl_database_entity;
use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessment_user_assignments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub keycloak_user_id: String,
    pub org_id: String,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::AssessmentId);

#[derive(Clone)]
pub struct AssessmentUserAssignmentsService {
    db_service: DatabaseService<Entity>,
}

impl AssessmentUserAssignmentsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    /// Replace all user assignments for an assessment (assessment-centric).
    pub async fn set_assessment_users(
        &self,
        assessment_id: Uuid,
        org_id: &str,
        user_ids: &[String],
    ) -> Result<(), DbErr> {
        let conn = self.db_service.get_connection();

        Entity::delete_many()
            .filter(Column::AssessmentId.eq(assessment_id))
            .exec(conn)
            .await?;

        let now = Utc::now();
        for user_id in user_ids {
            let row = ActiveModel {
                assessment_id: Set(assessment_id),
                keycloak_user_id: Set(user_id.clone()),
                org_id: Set(org_id.to_string()),
                assigned_at: Set(now),
            };
            let _ = self.db_service.create(row).await;
        }

        Ok(())
    }

    /// Replace all assessment assignments for a user (user-centric, from the user catalog).
    pub async fn set_user_assessments(
        &self,
        org_id: &str,
        keycloak_user_id: &str,
        assessment_ids: &[Uuid],
    ) -> Result<(), DbErr> {
        let conn = self.db_service.get_connection();

        Entity::delete_many()
            .filter(Column::OrgId.eq(org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(conn)
            .await?;

        let now = Utc::now();
        for &assessment_id in assessment_ids {
            let row = ActiveModel {
                assessment_id: Set(assessment_id),
                keycloak_user_id: Set(keycloak_user_id.to_string()),
                org_id: Set(org_id.to_string()),
                assigned_at: Set(now),
            };
            let _ = self.db_service.create(row).await;
        }

        Ok(())
    }

    /// Get the user IDs assigned to an assessment.
    pub async fn get_assigned_user_ids(
        &self,
        assessment_id: Uuid,
    ) -> Result<Vec<String>, DbErr> {
        let rows = Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .all(self.db_service.get_connection())
            .await?;

        Ok(rows.into_iter().map(|r| r.keycloak_user_id).collect())
    }

    /// Get the assessment IDs assigned to a user in an org.
    pub async fn get_assigned_assessment_ids_for_user(
        &self,
        org_id: &str,
        keycloak_user_id: &str,
    ) -> Result<Vec<Uuid>, DbErr> {
        let rows = Entity::find()
            .filter(Column::OrgId.eq(org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .all(self.db_service.get_connection())
            .await?;

        Ok(rows.into_iter().map(|r| r.assessment_id).collect())
    }

    /// Check whether a user is assigned to an assessment.
    pub async fn is_user_assigned(
        &self,
        assessment_id: Uuid,
        keycloak_user_id: &str,
    ) -> Result<bool, DbErr> {
        let count = Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .count(self.db_service.get_connection())
            .await?;
        Ok(count > 0)
    }

    /// Remove all assignments for an assessment (called when an assessment is deleted).
    pub async fn remove_assessment_assignments(
        &self,
        assessment_id: Uuid,
    ) -> Result<(), DbErr> {
        Entity::delete_many()
            .filter(Column::AssessmentId.eq(assessment_id))
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }

    /// Remove all assignments for a user in an org (called when a user is removed from the org).
    pub async fn remove_user_assignments(
        &self,
        org_id: &str,
        keycloak_user_id: &str,
    ) -> Result<(), DbErr> {
        Entity::delete_many()
            .filter(Column::OrgId.eq(org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }

    /// Remove all assignments for a user across all organizations (called when a user is deleted).
    pub async fn remove_all_user_assignments(
        &self,
        keycloak_user_id: &str,
    ) -> Result<(), DbErr> {
        Entity::delete_many()
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }
}
