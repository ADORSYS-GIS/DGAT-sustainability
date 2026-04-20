use crate::impl_database_entity;
use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "user_category_assignments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub keycloak_org_id: String,
    pub keycloak_user_id: String,
    /// The category_catalog UUID — stable, no casing issues
    pub category_catalog_id: Uuid,
    pub assigned_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::Id);

#[derive(Clone)]
pub struct UserCategoryAssignmentsService {
    db_service: DatabaseService<Entity>,
}

impl UserCategoryAssignmentsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    /// Replace all category assignments for a user in an org.
    /// `category_ids` are `category_catalog_id` UUIDs sent by the frontend.
    pub async fn set_user_categories(
        &self,
        keycloak_org_id: &str,
        keycloak_user_id: &str,
        category_ids: &[Uuid],
    ) -> Result<(), DbErr> {
        let conn = self.db_service.get_connection();

        // Remove all existing assignments for this user in this org
        Entity::delete_many()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(conn)
            .await?;

        let now = Utc::now();
        for &category_catalog_id in category_ids {
            let row = ActiveModel {
                id: Set(Uuid::new_v4()),
                keycloak_org_id: Set(keycloak_org_id.to_string()),
                keycloak_user_id: Set(keycloak_user_id.to_string()),
                category_catalog_id: Set(category_catalog_id),
                assigned_at: Set(now),
            };
            let _ = self.db_service.create(row).await;
        }

        Ok(())
    }

    /// Returns all distinct `category_catalog_id` UUIDs that have been assigned
    /// to at least one Org_User in the given organization.
    pub async fn get_assigned_category_ids_for_org(
        &self,
        keycloak_org_id: &str,
    ) -> Result<Vec<Uuid>, DbErr> {
        let rows = Entity::find()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .all(self.db_service.get_connection())
            .await?;

        let mut ids: Vec<Uuid> = rows.into_iter().map(|r| r.category_catalog_id).collect();
        ids.sort();
        ids.dedup();
        Ok(ids)
    }

    /// Remove all assignments for a user (called when a user is removed from the org).
    pub async fn remove_user_assignments(
        &self,
        keycloak_org_id: &str,
        keycloak_user_id: &str,
    ) -> Result<(), DbErr> {
        Entity::delete_many()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }
}
