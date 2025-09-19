use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "categories")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub category_id: Uuid,
    pub name: String,
    pub weight: i32,
    pub order: i32,
    pub template_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::CategoryId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct CategoriesService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl CategoriesService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_category(
        &self,
        category_id: Uuid,
        name: String,
        weight: i32,
        order: i32,
        template_id: String,
    ) -> Result<Model, DbErr> {
        let now = Utc::now();
        let category = ActiveModel {
            category_id: Set(category_id),
            name: Set(name),
            weight: Set(weight),
            order: Set(order),
            template_id: Set(template_id),
            created_at: Set(now),
            updated_at: Set(now),
        };

        self.db_service.create(category).await
    }

    pub async fn get_category_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_all_categories(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn get_categories_by_template(&self, template_id: &str) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::TemplateId.eq(template_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn update_category(
        &self,
        category_id: Uuid,
        name: Option<String>,
        weight: Option<i32>,
        order: Option<i32>,
    ) -> Result<Model, DbErr> {
        let category = self
            .get_category_by_id(category_id)
            .await?
            .ok_or(DbErr::Custom("Category not found".to_string()))?;

        let mut category: ActiveModel = category.into();

        if let Some(name) = name {
            category.name = Set(name);
        }
        if let Some(weight) = weight {
            category.weight = Set(weight);
        }
        if let Some(order) = order {
            category.order = Set(order);
        }
        category.updated_at = Set(Utc::now());

        self.db_service.update(category).await
    }

    pub async fn delete_category(&self, category_id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(category_id).await
    }
}
