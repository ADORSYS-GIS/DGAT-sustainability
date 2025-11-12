use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{QueryOrder, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "category_catalog")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub category_catalog_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_id: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::organization_categories::Entity")]
    OrganizationCategories,
    #[sea_orm(has_many = "super::assessment_categories::Entity")]
    AssessmentCategories,
}

impl Related<super::organization_categories::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OrganizationCategories.def()
    }
}

impl Related<super::assessment_categories::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentCategories.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::CategoryCatalogId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct CategoryCatalogService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl CategoryCatalogService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_category_catalog(
        &self,
        category_catalog_id: Uuid,
        name: String,
        description: Option<String>,
        template_id: String,
        is_active: bool,
    ) -> Result<Model, DbErr> {
        let now = Utc::now();
        let category_catalog = ActiveModel {
            category_catalog_id: Set(category_catalog_id),
            name: Set(name),
            description: Set(description),
            template_id: Set(template_id),
            is_active: Set(is_active),
            created_at: Set(now),
            updated_at: Set(now),
        };

        self.db_service.create(category_catalog).await
    }

    pub async fn get_category_catalog_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_all_active_categories(&self) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::IsActive.eq(true))
            .order_by_asc(Column::Name)
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_categories(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn get_categories_by_template(&self, template_id: &str) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::TemplateId.eq(template_id))
            .filter(Column::IsActive.eq(true))
            .order_by_asc(Column::Name)
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn update_category_catalog(
        &self,
        category_catalog_id: Uuid,
        name: Option<String>,
        description: Option<String>,
        is_active: Option<bool>,
    ) -> Result<Model, DbErr> {
        let model = self.db_service.find_by_id(category_catalog_id).await?
            .ok_or_else(|| DbErr::RecordNotFound("Category catalog not found".to_string()))?;
        let mut active_model: ActiveModel = model.into();
        
        if let Some(name) = name {
            active_model.name = Set(name);
        }
        if let Some(description) = description {
            active_model.description = Set(Some(description));
        }
        if let Some(is_active) = is_active {
            active_model.is_active = Set(is_active);
        }
        active_model.updated_at = Set(Utc::now());

        self.db_service.update(active_model).await
    }

    pub async fn delete_category_catalog(
        &self,
        category_catalog_id: Uuid,
        txn: Option<&sea_orm::DatabaseTransaction>,
    ) -> Result<(), DbErr> {
        let query = Entity::delete_by_id(category_catalog_id);

        let result = if let Some(txn) = txn {
            query.exec(txn).await?
        } else {
            query.exec(self.db_service.get_connection()).await?
        };

        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound(
                "Category catalog not found".to_string(),
            ));
        }

        Ok(())
    }
}
