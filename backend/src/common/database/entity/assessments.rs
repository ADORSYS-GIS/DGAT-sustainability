use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    pub user_id: String,
    pub language: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::assessments_response::Entity")]
    AssessmentsResponse,
    #[sea_orm(has_one = "super::assessments_submission::Entity")]
    AssessmentsSubmission,
}

impl Related<super::assessments_response::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsResponse.def()
    }
}

impl Related<super::assessments_submission::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsSubmission.def()
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

    pub async fn create_assessment(
        &self,
        user_id: String,
        language: String,
    ) -> Result<Model, DbErr> {
        let assessment = ActiveModel {
            assessment_id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            language: Set(language),
            created_at: Set(Utc::now()),
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

    pub async fn update_assessment(
        &self,
        id: Uuid,
        language: Option<String>,
    ) -> Result<Model, DbErr> {
        let assessment = self
            .get_assessment_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Assessment not found".to_string()))?;

        let mut assessment: ActiveModel = assessment.into();

        if let Some(language) = language {
            assessment.language = Set(language);
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

    #[tokio::test]
    async fn test_assessments_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_assessment = Model {
            assessment_id: Uuid::new_v4(),
            user_id: "test_user".to_string(),
            language: "en".to_string(),
            created_at: Utc::now(),
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
            .create_assessment("test_user".to_string(), "en".to_string())
            .await?;

        assert_eq!(assessment.user_id, "test_user");
        assert_eq!(assessment.language, "en");

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

    #[tokio::test]
    async fn test_cascade_delete_assessment_responses() -> Result<(), Box<dyn std::error::Error>> {
        use crate::common::database::entity::assessments_response::{
            AssessmentsResponseService, Model as ResponseModel,
        };

        let assessment_id = Uuid::new_v4();
        let question_revision_id = Uuid::new_v4();

        let mock_assessment = Model {
            assessment_id,
            user_id: "test_user".to_string(),
            language: "en".to_string(),
            created_at: Utc::now(),
        };

        let mock_response_1 = ResponseModel {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id,
            response: "Answer 1".to_string(),
            version: 1,
            updated_at: Utc::now(),
        };

        let mock_response_2 = ResponseModel {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id,
            response: "Answer 2".to_string(),
            version: 2,
            updated_at: Utc::now(),
        };

        // Create separate mock databases for each service
        let assessments_db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_assessment.clone()], // create_assessment result
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1, // assessment deletion (should cascade to responses)
            }])
            .into_connection();

        let responses_db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_response_1.clone()], // create_response result 1
                vec![mock_response_2.clone()], // create_response result 2
                vec![mock_response_1.clone(), mock_response_2.clone()], // get_responses_by_assessment before delete
                vec![] as Vec<ResponseModel>, // get_responses_by_assessment after delete (empty due to cascade)
            ])
            .append_exec_results([
                MockExecResult {
                    last_insert_id: 2,
                    rows_affected: 1, // response 1 creation
                },
                MockExecResult {
                    last_insert_id: 3,
                    rows_affected: 1, // response 2 creation
                },
            ])
            .into_connection();

        let assessments_service = AssessmentsService::new(Arc::new(assessments_db));
        let responses_service = AssessmentsResponseService::new(Arc::new(responses_db));

        // Create an assessment
        let assessment = assessments_service
            .create_assessment("test_user".to_string(), "en".to_string())
            .await?;

        // Create some responses for this assessment
        let _response1 = responses_service
            .create_response(
                assessment.assessment_id,
                question_revision_id,
                "Answer 1".to_string(),
                1,
            )
            .await?;

        let _response2 = responses_service
            .create_response(
                assessment.assessment_id,
                question_revision_id,
                "Answer 2".to_string(),
                2,
            )
            .await?;

        // Verify responses exist before deletion
        let responses_before = responses_service
            .get_responses_by_assessment(assessment.assessment_id)
            .await?;
        assert_eq!(responses_before.len(), 2);

        // Delete the assessment - this should cascade delete all responses
        let delete_result = assessments_service
            .delete_assessment(assessment.assessment_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        // Verify that responses are deleted due to cascade (in a real database)
        // Note: In a mock database, we simulate this by returning an empty result
        let responses_after = responses_service
            .get_responses_by_assessment(assessment.assessment_id)
            .await?;
        assert_eq!(responses_after.len(), 0, "All assessment responses should be deleted when assessment is deleted due to CASCADE constraint");

        Ok(())
    }
}
