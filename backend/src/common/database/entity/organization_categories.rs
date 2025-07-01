use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "organization_categories")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub category_id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    #[sea_orm(nullable)]
    pub description: Option<String>,
    pub categories: Vec<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::questions::Entity")]
    Questions,
}

impl Related<super::questions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Questions.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::CategoryId);

// OrganizationCategoriesService implementation
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

    pub async fn create_category(
        &self,
        organization_id: Uuid,
        name: String,
        description: Option<String>,
        categories: Vec<String>,
    ) -> Result<Model, DbErr> {
        let category = ActiveModel {
            category_id: Set(Uuid::new_v4()),
            organization_id: Set(organization_id),
            name: Set(name),
            description: Set(description),
            categories: Set(categories),
        };

        self.db_service.create(category).await
    }

    pub async fn get_category_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_categories_by_organization(
        &self,
        organization_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::OrganizationId.eq(organization_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_categories(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn update_category(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        categories: Option<Vec<String>>,
    ) -> Result<Model, DbErr> {
        let category = self
            .get_category_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Category not found".to_string()))?;

        let mut category: ActiveModel = category.into();

        if let Some(name) = name {
            category.name = Set(name);
        }
        if let Some(description) = description {
            category.description = Set(Some(description));
        }
        if let Some(categories) = categories {
            category.categories = Set(categories);
        }

        self.db_service.update(category).await
    }

    pub async fn delete_category(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

    #[tokio::test]
    async fn test_organization_categories_service() -> Result<(), Box<dyn std::error::Error>> {
        let category_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let test_categories = vec!["test".to_string(), "category".to_string()];
        let updated_categories = vec!["updated".to_string(), "category".to_string()];

        let mock_category = Model {
            category_id,
            organization_id,
            name: "Test Category".to_string(),
            description: Some("Test Description".to_string()),
            categories: test_categories.clone(),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // create_category result
                vec![mock_category.clone()],
                // get all categories result
                vec![mock_category.clone()],
                // get_category_by_id result
                vec![mock_category.clone()],
                // get_categories_by_organization result
                vec![mock_category.clone()],
                vec![mock_category.clone()],
                // update_category result
                vec![Model {
                    category_id,
                    organization_id,
                    name: "Updated Category".to_string(),
                    description: Some("Updated Description".to_string()),
                    categories: updated_categories.clone(),
                }],
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let categories_service = OrganizationCategoriesService::new(Arc::new(db));

        // Test create
        let category = categories_service
            .create_category(
                organization_id,
                "Test Category".to_string(),
                Some("Test Description".to_string()),
                test_categories.clone(),
            )
            .await?;

        assert_eq!(category.organization_id, organization_id);
        assert_eq!(category.name, "Test Category");

        // Test get all categories
        let categories = categories_service.get_all_categories().await?;
        assert!(!categories.is_empty());

        // Test get by id
        let found = categories_service
            .get_category_by_id(category.category_id)
            .await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.organization_id, organization_id);

        // Test get by organization
        let org_categories = categories_service
            .get_categories_by_organization(organization_id)
            .await?;
        assert!(!org_categories.is_empty());
        assert_eq!(org_categories[0].organization_id, organization_id);

        // Test update
        let updated = categories_service
            .update_category(
                category.category_id,
                Some("Updated Category".to_string()),
                Some("Updated Description".to_string()),
                Some(updated_categories.clone()),
            )
            .await?;
        assert_eq!(updated.name, "Updated Category");
        assert_eq!(updated.description, Some("Updated Description".to_string()));

        // Test delete
        let delete_result = categories_service
            .delete_category(category.category_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_category_not_found() -> Result<(), Box<dyn std::error::Error>> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results::<Model, _, _>([vec![]])
            .into_connection();

        let categories_service = OrganizationCategoriesService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = categories_service
            .get_category_by_id(non_existent_id)
            .await?;
        assert!(result.is_none());

        let update_result = categories_service
            .update_category(
                non_existent_id,
                Some("Updated Category".to_string()),
                None,
                None,
            )
            .await;
        assert!(update_result.is_err());

        Ok(())
    }
}
