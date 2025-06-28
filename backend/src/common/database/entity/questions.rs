use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "questions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub question_id: Uuid,
    pub text: Value,
    pub category: String,
    pub weight: f32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::QuestionId);

// Questions-specific service that extends the generic DatabaseService
#[allow(dead_code)]
#[derive(Clone)]
pub struct QuestionsService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl QuestionsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    // Create a new question
    pub async fn create_question(
        &self,
        text: Value,
        category: String,
        weight: f32,
    ) -> Result<Model, DbErr> {
        let question = ActiveModel {
            question_id: Set(Uuid::new_v4()),
            text: Set(text),
            category: Set(category),
            weight: Set(weight),
        };

        self.db_service.create(question).await
    }

    // Get all questions (using generic implementation)
    pub async fn get_all_questions(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    // Get question by ID
    pub async fn get_question_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    // Update question
    pub async fn update_question(
        &self,
        id: Uuid,
        text: Option<Value>,
        category: Option<String>,
        weight: Option<f32>,
    ) -> Result<Model, DbErr> {
        let question = self
            .get_question_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Question not found".to_string()))?;

        let mut question: ActiveModel = question.into();

        if let Some(text) = text {
            question.text = Set(text);
        }
        if let Some(category) = category {
            question.category = Set(category);
        }
        if let Some(weight) = weight {
            question.weight = Set(weight);
        }

        self.db_service.update(question).await
    }

    // Delete question
    pub async fn delete_question(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_questions_service() -> Result<(), Box<dyn std::error::Error>> {
        // Predefine a UUID for consistent testing
        let question_id = Uuid::new_v4();

        // Create a mock database
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // Result for create_question
                vec![Model {
                    question_id,
                    text: json!({"en": "Test question?"}),
                    category: "Test".to_string(),
                    weight: 1.0,
                }],
                // Result for get_question_by_id (test read)
                vec![Model {
                    question_id,
                    text: json!({"en": "Test question?"}),
                    category: "Test".to_string(),
                    weight: 1.0,
                }],
                // Result for update_question
                vec![Model {
                    question_id,
                    text: json!({"en": "Test question?"}),
                    category: "Updated".to_string(),
                    weight: 1.0,
                }],
                // Result for get_all_questions
                vec![Model {
                    question_id,
                    text: json!({"en": "Test question?"}),
                    category: "Updated".to_string(),
                    weight: 1.0,
                }],
                // Result for get_question_by_id (in delete_question)
                vec![Model {
                    question_id,
                    text: json!({"en": "Test question?"}),
                    category: "Updated".to_string(),
                    weight: 1.0,
                }],
            ])
            .append_exec_results([
                // Result for create_question (if needed)
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                // Result for actual delete operation
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let questions_service = QuestionsService::new(Arc::new(db));

        // Test create
        let question = questions_service
            .create_question(json!({"en": "Test question?"}), "Test".to_string(), 1.0)
            .await?;

        // Verify the question was created with correct data
        assert_eq!(question.category, "Test");
        assert_eq!(question.weight, 1.0);
        assert_eq!(question.text, json!({"en": "Test question?"}));

        // Test read
        let found = questions_service
            .get_question_by_id(question.question_id)
            .await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.category, "Test");

        // Test update
        let updated = questions_service
            .update_question(
                question.question_id,
                None,
                Some("Updated".to_string()),
                None,
            )
            .await?;
        assert_eq!(updated.category, "Updated");

        // Test get all questions
        let all_questions = questions_service.get_all_questions().await?;
        assert_eq!(all_questions.len(), 1);
        assert_eq!(all_questions[0].category, "Updated");

        // Test delete
        let delete_result = questions_service
            .delete_question(question.question_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_question_not_found() -> Result<(), Box<dyn std::error::Error>> {
        // Create a mock database with empty results
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // Empty result for get_question_by_id
                Vec::<Model>::new(),
            ])
            .into_connection();

        let questions_service = QuestionsService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = questions_service
            .get_question_by_id(non_existent_id)
            .await?;
        assert!(result.is_none());

        let update_result = questions_service
            .update_question(non_existent_id, None, Some("Updated".to_string()), None)
            .await;
        assert!(update_result.is_err());

        Ok(())
    }
}
