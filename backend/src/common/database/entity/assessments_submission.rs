use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;


#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments_submission")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub submission_id: Uuid, // Also FK to assessments
    pub user_id: String,             // Keycloak sub
    pub content: Value,              // JSON blob with all answers
    pub submitted_at: DateTime<Utc>, // When the submission was created
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::SubmissionId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
    #[sea_orm(has_one = "super::submission_reports::Entity")]
    SubmissionReport,
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl Related<super::submission_reports::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SubmissionReport.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::SubmissionId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct AssessmentsSubmissionService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl AssessmentsSubmissionService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_submission(
        &self,
        assessment_id: Uuid,
        user_id: String,
        content: Value,
    ) -> Result<Model, DbErr> {
        let submission = ActiveModel {
            submission_id: Set(assessment_id),
            user_id: Set(user_id),
            content: Set(content),
            submitted_at: Set(Utc::now()),
        };

        self.db_service.create(submission).await
    }

    pub async fn get_submission_by_assessment_id(
        &self,
        assessment_id: Uuid,
    ) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(assessment_id).await
    }

    pub async fn get_submissions_by_user(&self, user_id: &str) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_submissions(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn delete_submission(&self, assessment_id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(assessment_id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_assessments_submission_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_submission = Model {
            submission_id: Uuid::new_v4(),
            user_id: "test_user".to_string(),
            content: json!({"question1": "answer1", "question2": "answer2"}),
            submitted_at: Utc::now(),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_submission.clone()],
                vec![mock_submission.clone()],
                vec![mock_submission.clone()],
                vec![mock_submission.clone()],
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let service = AssessmentsSubmissionService::new(Arc::new(db));

        // Test create
        let submission = service
            .create_submission(
                mock_submission.submission_id,
                "test_user".to_string(),
                json!({"question1": "answer1", "question2": "answer2"}),
            )
            .await?;

        assert_eq!(submission.submission_id, mock_submission.submission_id);
        assert_eq!(submission.user_id, "test_user");

        // Test get by assessment id
        let found = service
            .get_submission_by_assessment_id(submission.submission_id)
            .await?;
        assert!(found.is_some());

        // Test get by user
        let user_submissions = service.get_submissions_by_user("test_user").await?;
        assert!(!user_submissions.is_empty());
        assert_eq!(user_submissions[0].user_id, "test_user");

        // Test get all
        let all_submissions = service.get_all_submissions().await?;
        assert!(!all_submissions.is_empty());

        // Test delete
        let delete_result = service.delete_submission(submission.submission_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
}
