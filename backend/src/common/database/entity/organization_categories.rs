use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{QueryOrder, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "organization_categories")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub organization_category_id: Uuid,
    pub keycloak_organization_id: String, // Reference to Keycloak organization ID
    pub category_catalog_id: Uuid, // Reference to category catalog
    pub weight: i32, // Organization-specific weight (1-100)
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::category_catalog::Entity",
        from = "Column::CategoryCatalogId",
        to = "super::category_catalog::Column::CategoryCatalogId"
    )]
    CategoryCatalog,
}

impl Related<super::category_catalog::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CategoryCatalog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::OrganizationCategoryId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct OrganizationCategoriesService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl OrganizationCategoriesService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_organization_category(
        &self,
        organization_category_id: Uuid,
        keycloak_organization_id: String,
        category_catalog_id: Uuid,
        weight: i32,
        order: i32,
    ) -> Result<Model, DbErr> {
        let now = Utc::now();
        let organization_category = ActiveModel {
            organization_category_id: Set(organization_category_id),
            keycloak_organization_id: Set(keycloak_organization_id),
            category_catalog_id: Set(category_catalog_id),
            weight: Set(weight),
            order: Set(order),
            created_at: Set(now),
            updated_at: Set(now),
        };

        self.db_service.create(organization_category).await
    }

    pub async fn get_organization_categories_by_keycloak_organization_id(
        &self,
        keycloak_organization_id: &str,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::KeycloakOrganizationId.eq(keycloak_organization_id))
            .order_by_asc(Column::Order)
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_organization_category_by_id(
        &self,
        id: Uuid,
    ) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn update_organization_category(
        &self,
        organization_category_id: Uuid,
        weight: Option<i32>,
        order: Option<i32>,
    ) -> Result<Model, DbErr> {
        let model = self.db_service.find_by_id(organization_category_id).await?
            .ok_or_else(|| DbErr::RecordNotFound("Organization category not found".to_string()))?;
        let mut active_model: ActiveModel = model.into();
        
        if let Some(weight) = weight {
            active_model.weight = Set(weight);
        }
        if let Some(order) = order {
            active_model.order = Set(order);
        }
        active_model.updated_at = Set(Utc::now());

        self.db_service.update(active_model).await
    }

    pub async fn delete_organization_category(&self, organization_category_id: Uuid) -> Result<(), DbErr> {
        Entity::delete_by_id(organization_category_id)
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }

    pub async fn delete_organization_categories_by_keycloak_organization_id(
        &self,
        keycloak_organization_id: &str,
    ) -> Result<(), DbErr> {
        Entity::delete_many()
            .filter(Column::KeycloakOrganizationId.eq(keycloak_organization_id))
            .exec(self.db_service.get_connection())
            .await?;
        Ok(())
    }

    pub async fn get_total_weight_for_organization(&self, keycloak_organization_id: &str) -> Result<i32, DbErr> {
        let categories = self.get_organization_categories_by_keycloak_organization_id(keycloak_organization_id).await?;
        let total_weight: i32 = categories.iter().map(|cat| cat.weight).sum();
        Ok(total_weight)
    }
}
