use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, QueryOrder, Set};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "questions_revisions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub question_revision_id: Uuid,
    pub question_id: Uuid,
    pub text: Value, // jsonb for i18n support
    pub weight: f32,
    pub created_at: String, // Simplified for now
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::questions::Entity",
        from = "Column::QuestionId",
        to = "super::questions::Column::QuestionId"
    )]
    Question,
    #[sea_orm(has_many = "super::assessments_response::Entity")]
    AssessmentsResponse,
}

impl Related<super::questions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Question.def()
    }
}

impl Related<super::assessments_response::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsResponse.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::QuestionRevisionId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct QuestionsRevisionsService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl QuestionsRevisionsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_question_revision(
        &self,
        question_id: Uuid,
        text: Value,
        weight: f32,
    ) -> Result<Model, DbErr> {
        let question_revision = ActiveModel {
            question_revision_id: Set(Uuid::new_v4()),
            question_id: Set(question_id),
            text: Set(text),
            weight: Set(weight),
            created_at: Set(chrono::Utc::now().to_rfc3339()),
        };

        self.db_service.create(question_revision).await
    }

    pub async fn get_revision_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_revisions_by_question(&self, question_id: Uuid) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::QuestionId.eq(question_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_latest_revision_by_question(
        &self,
        question_id: Uuid,
    ) -> Result<Option<Model>, DbErr> {
        Entity::find()
            .filter(Column::QuestionId.eq(question_id))
            .order_by_desc(Column::CreatedAt)
            .one(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_revisions(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn delete_revision(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_questions_revisions_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_revision = Model {
            question_revision_id: Uuid::new_v4(),
            question_id: Uuid::new_v4(),
            text: json!({"en": "Question text"}),
            weight: 1.5,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_revision.clone()],
                vec![mock_revision.clone()],
                vec![mock_revision.clone()],
                vec![mock_revision.clone()],
                vec![mock_revision.clone()],
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let service = QuestionsRevisionsService::new(Arc::new(db));

        // Test create
        let revision = service
            .create_question_revision(
                mock_revision.question_id,
                json!({"en": "Question text"}),
                1.5,
            )
            .await?;

        assert_eq!(revision.question_id, mock_revision.question_id);
        assert_eq!(revision.weight, 1.5);

        // Test get by id
        let found = service
            .get_revision_by_id(revision.question_revision_id)
            .await?;
        assert!(found.is_some());

        // Test get by question
        let question_revisions = service
            .get_revisions_by_question(revision.question_id)
            .await?;
        assert!(!question_revisions.is_empty());

        // Test get latest
        let latest = service
            .get_latest_revision_by_question(revision.question_id)
            .await?;
        assert!(latest.is_some());

        // Test get all
        let all_revisions = service.get_all_revisions().await?;
        assert!(!all_revisions.is_empty());

        // Test delete
        let delete_result = service
            .delete_revision(revision.question_revision_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
}
