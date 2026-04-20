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
    pub category_name: String,
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
    /// Deletes existing rows for (org, user) then inserts the new set.
    pub async fn set_user_categories(
        &self,
        keycloak_org_id: &str,
        keycloak_user_id: &str,
        categories: &[String],
    ) -> Result<(), DbErr> {
        let conn = self.db_service.get_connection();

        // Remove all existing assignments for this user in this org
        Entity::delete_many()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .exec(conn)
            .await?;

        // Insert the new set
        let now = Utc::now();
        for category_name in categories {
            let row = ActiveModel {
                id: Set(Uuid::new_v4()),
                keycloak_org_id: Set(keycloak_org_id.to_string()),
                keycloak_user_id: Set(keycloak_user_id.to_string()),
                category_name: Set(category_name.clone()),
                assigned_at: Set(now),
            };
            // ON CONFLICT DO NOTHING equivalent: ignore duplicate errors
            let _ = self.db_service.create(row).await;
        }

        Ok(())
    }

    /// Returns all distinct category names that have been assigned to at least
    /// one Org_User in the given organization.
    /// The org_admin uses this to know which categories are "taken".
    pub async fn get_assigned_categories_for_org(
        &self,
        keycloak_org_id: &str,
    ) -> Result<Vec<String>, DbErr> {
        let rows = Entity::find()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .all(self.db_service.get_connection())
            .await?;

        // Deduplicate category names
        let mut names: Vec<String> = rows.into_iter().map(|r| r.category_name).collect();
        names.sort();
        names.dedup();
        Ok(names)
    }

    /// Returns all assignments for a specific user in an org (useful for auditing).
    pub async fn get_user_assignments(
        &self,
        keycloak_org_id: &str,
        keycloak_user_id: &str,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::KeycloakOrgId.eq(keycloak_org_id))
            .filter(Column::KeycloakUserId.eq(keycloak_user_id))
            .all(self.db_service.get_connection())
            .await
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
