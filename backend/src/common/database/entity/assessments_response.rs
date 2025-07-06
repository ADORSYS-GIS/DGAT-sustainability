use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, QueryOrder, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments_response")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub response_id: Uuid,
    pub assessment_id: Uuid,
    pub question_revision_id: Uuid,
    pub response: String,
    pub version: i32,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
    #[sea_orm(
        belongs_to = "super::questions_revisions::Entity",
        from = "Column::QuestionRevisionId",
        to = "super::questions_revisions::Column::QuestionRevisionId"
    )]
    QuestionRevision,
    #[sea_orm(has_many = "super::assessments_response_file::Entity")]
    AssessmentsResponseFile,
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl Related<super::questions_revisions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::QuestionRevision.def()
    }
}

impl Related<super::assessments_response_file::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsResponseFile.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::ResponseId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct AssessmentsResponseService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl AssessmentsResponseService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_response(
        &self,
        assessment_id: Uuid,
        question_revision_id: Uuid,
        response: String,
        version: i32,
    ) -> Result<Model, DbErr> {
        let response_model = ActiveModel {
            response_id: Set(Uuid::new_v4()),
            assessment_id: Set(assessment_id),
            question_revision_id: Set(question_revision_id),
            response: Set(response),
            version: Set(version),
            updated_at: Set(Utc::now()),
        };

        self.db_service.create(response_model).await
    }

    pub async fn get_response_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_responses_by_assessment(
        &self,
        assessment_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_latest_responses_by_assessment(
        &self,
        assessment_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        let all_responses = self.get_responses_by_assessment(assessment_id).await?;

        // Use a HashMap to track only the latest response for each question_revision_id
        let mut latest_map: std::collections::HashMap<Uuid, Model> =
            std::collections::HashMap::new();

        for response in all_responses {
            match latest_map.entry(response.question_revision_id) {
                std::collections::hash_map::Entry::Vacant(entry) => {
                    entry.insert(response);
                }
                std::collections::hash_map::Entry::Occupied(mut entry) => {
                    // Only replace if this response has a higher version
                    if response.version > entry.get().version {
                        entry.insert(response);
                    }
                }
            }
        }

        // Convert the HashMap values to a Vec
        Ok(latest_map.into_values().collect())
    }

    pub async fn update_response(
        &self,
        assessment_id: Uuid,
        question_revision_id: Uuid,
        response_text: String,
    ) -> Result<Model, DbErr> {
        // Find the current highest version for this question in this assessment
        let current_version = Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .filter(Column::QuestionRevisionId.eq(question_revision_id))
            .order_by_desc(Column::Version)
            .one(self.db_service.get_connection())
            .await?;

        let new_version = match current_version {
            Some(v) => v.version + 1,
            None => 1, // First version
        };

        // Create a new response with incremented version
        self.create_response(
            assessment_id,
            question_revision_id,
            response_text,
            new_version,
        )
        .await
    }

    /// Create a response with version validation from frontend
    /// If the version already exists, keep the latest one based on timestamp
    pub async fn create_response_with_version_validation(
        &self,
        assessment_id: Uuid,
        question_revision_id: Uuid,
        response: String,
        version: i32,
    ) -> Result<Model, DbErr> {
        // Check if a response with this version already exists
        let existing_response = Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .filter(Column::QuestionRevisionId.eq(question_revision_id))
            .filter(Column::Version.eq(version))
            .one(self.db_service.get_connection())
            .await?;

        match existing_response {
            Some(existing) => {
                // Version conflict detected - keep the latest based on timestamp
                let new_timestamp = Utc::now();

                // If the new response is more recent, replace the existing one
                if new_timestamp > existing.updated_at {
                    // Delete the existing response
                    self.delete_response(existing.response_id).await?;

                    // Create the new response
                    self.create_response(assessment_id, question_revision_id, response, version)
                        .await
                } else {
                    // Keep the existing response (it's more recent)
                    Ok(existing)
                }
            }
            None => {
                // No conflict, create the response normally
                self.create_response(assessment_id, question_revision_id, response, version)
                    .await
            }
        }
    }

    pub async fn delete_response(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

    #[tokio::test]
    async fn test_assessments_response_service() -> Result<(), Box<dyn std::error::Error>> {
        let now = Utc::now();
        let mock_response = Model {
            response_id: Uuid::new_v4(),
            assessment_id: Uuid::new_v4(),
            question_revision_id: Uuid::new_v4(),
            response: "test answer".to_string(),
            version: 1,
            updated_at: now,
        };

        let mock_response_v2 = Model {
            response_id: Uuid::new_v4(),
            assessment_id: mock_response.assessment_id,
            question_revision_id: mock_response.question_revision_id,
            response: "updated answer".to_string(),
            version: 2,
            updated_at: now,
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_response.clone()],
                vec![mock_response.clone()],
                vec![mock_response.clone(), mock_response_v2.clone()],
                vec![mock_response_v2.clone()],
                vec![mock_response.clone()],
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let service = AssessmentsResponseService::new(Arc::new(db));

        // Test create
        let response = service
            .create_response(
                mock_response.assessment_id,
                mock_response.question_revision_id,
                "test answer".to_string(),
                1,
            )
            .await?;

        assert_eq!(response.assessment_id, mock_response.assessment_id);

        // Test get by id
        let found = service.get_response_by_id(response.response_id).await?;
        assert!(found.is_some());

        // Test get by assessment
        let assessment_responses = service
            .get_responses_by_assessment(response.assessment_id)
            .await?;
        assert_eq!(assessment_responses.len(), 2); // Both versions returned

        // Test get latest by assessment
        let latest_responses = service
            .get_latest_responses_by_assessment(response.assessment_id)
            .await?;
        assert_eq!(latest_responses.len(), 1); // Only one latest version per question
        assert_eq!(latest_responses[0].version, 2); // Highest version

        // Test delete
        let delete_result = service.delete_response(response.response_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_version_validation_and_conflict_resolution(
    ) -> Result<(), Box<dyn std::error::Error>> {
        let old_time = Utc::now() - chrono::Duration::hours(1);
        let new_time = Utc::now();

        let assessment_id = Uuid::new_v4();
        let question_revision_id = Uuid::new_v4();

        // Mock existing response with older timestamp
        let existing_response = Model {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id,
            response: "old answer".to_string(),
            version: 1,
            updated_at: old_time,
        };

        // Mock new response that should replace the old one
        let new_response = Model {
            response_id: Uuid::new_v4(),
            assessment_id,
            question_revision_id,
            response: "new answer".to_string(),
            version: 1, // Same version, but newer timestamp
            updated_at: new_time,
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // First call: check for existing version (returns existing)
                vec![existing_response.clone()],
                // Second call: after delete, create new response
                vec![new_response.clone()],
                // Third call: test no conflict scenario
                vec![],                     // No existing response
                vec![new_response.clone()], // Create new response
            ])
            .append_exec_results([
                // Delete existing response
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                // Create new response (conflict resolution)
                MockExecResult {
                    last_insert_id: 2,
                    rows_affected: 1,
                },
                // Create new response (no conflict)
                MockExecResult {
                    last_insert_id: 3,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let service = AssessmentsResponseService::new(Arc::new(db));

        // Test 1: Version conflict - newer timestamp should replace older
        let result = service
            .create_response_with_version_validation(
                assessment_id,
                question_revision_id,
                "new answer".to_string(),
                1, // Same version as existing
            )
            .await?;

        assert_eq!(result.response, "new answer");
        assert_eq!(result.version, 1);

        // Test 2: No conflict - should create normally
        let result2 = service
            .create_response_with_version_validation(
                assessment_id,
                question_revision_id,
                "another answer".to_string(),
                2, // Different version
            )
            .await?;

        assert_eq!(result2.version, 1); // Mock returns the same response

        Ok(())
    }
}
