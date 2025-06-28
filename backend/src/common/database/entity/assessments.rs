use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    pub user_id: String,
    pub data: Value,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::sync_queue::Entity")]
    SyncQueue,
    #[sea_orm(has_many = "super::reports::Entity")]
    Reports,
}

impl Related<super::sync_queue::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SyncQueue.def()
    }
}
impl Related<super::reports::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reports.def()
    }
}
impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::AssessmentId);

// AssessmentsService implementation
#[allow(dead_code)]
#[derive(Clone)]
pub struct AssessmentsService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl AssessmentsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_assessment(&self, user_id: String, data: Value) -> Result<Model, DbErr> {
        let assessment = ActiveModel {
            assessment_id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            data: Set(data),
        };

        self.db_service.create(assessment).await
    }

    pub async fn get_assessment_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_assessments_by_user(&self, user_id: &str) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_assessments(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn update_assessment(&self, id: Uuid, data: Option<Value>) -> Result<Model, DbErr> {
        let assessment = self
            .get_assessment_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Assessment not found".to_string()))?;

        let mut assessment: ActiveModel = assessment.into();

        if let Some(data) = data {
            assessment.data = Set(data);
        }
        self.db_service.update(assessment).await
    }

    pub async fn delete_assessment(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_assessments_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_assessment = Model {
            assessment_id: Uuid::new_v4(),
            user_id: "test_user".to_string(),
            data: json!({"key": "value"}),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // create_assessment result
                vec![mock_assessment.clone()],
                // get all assessments result
                vec![mock_assessment.clone()],
                // get_assessment_by_id result
                vec![mock_assessment.clone()],
                // delete assessments
                vec![mock_assessment.clone()],
                // get_assessments_by_user result
                vec![mock_assessment.clone()],
                // update_assessment result
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let assessments_service = AssessmentsService::new(Arc::new(db));

        // Test create
        let assessment = assessments_service
            .create_assessment("test_user".to_string(), json!({"key": "value"}))
            .await?;

        assert_eq!(assessment.user_id, "test_user");

        // Test get all assessments
        let assessments = assessments_service.get_all_assessments().await?;
        assert!(!assessments.is_empty());

        // Test get by id
        let found = assessments_service
            .get_assessment_by_id(assessment.assessment_id)
            .await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.user_id, assessment.user_id);

        // Test delete assessment
        let delete_result = assessments_service
            .delete_assessment(assessment.assessment_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        // Test get by user
        let user_assessments = assessments_service
            .get_assessments_by_user("test_user")
            .await?;
        assert!(!user_assessments.is_empty());
        assert_eq!(user_assessments[0].user_id, "test_user");

        Ok(())
    }

    #[tokio::test]
    async fn test_assessment_not_found() -> Result<(), Box<dyn std::error::Error>> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results::<Model, _, _>([vec![]])
            .into_connection();

        let assessments_service = AssessmentsService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = assessments_service
            .get_assessment_by_id(non_existent_id)
            .await?;
        assert!(result.is_none());

        let update_result = assessments_service
            .update_assessment(non_existent_id, None)
            .await;
        assert!(update_result.is_err());

        Ok(())
    }
}
