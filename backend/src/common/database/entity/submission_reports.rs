use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "submission_reports")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub report_id: Uuid,
    pub submission_id: Uuid, // Changed from assessment_id to match OpenAPI spec
    pub report_type: String,
    pub status: String,
    pub generated_at: DateTime<Utc>,
    pub data: Option<Value>, // Report content as JSON, nullable
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments_submission::Entity",
        from = "Column::SubmissionId",
        to = "super::assessments_submission::Column::SubmissionId"
    )]
    AssessmentSubmission,
}

impl Related<super::assessments_submission::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentSubmission.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::ReportId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct SubmissionReportsService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl SubmissionReportsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_report(
        &self,
        submission_id: Uuid,
        report_type: String,
        data: Option<Value>,
    ) -> Result<Model, DbErr> {
        let report = ActiveModel {
            report_id: Set(Uuid::new_v4()),
            submission_id: Set(submission_id),
            report_type: Set(report_type),
            status: Set("generating".to_string()),
            generated_at: Set(Utc::now()),
            data: Set(data),
        };

        self.db_service.create(report).await
    }

    pub async fn get_report_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_reports_by_submission(
        &self,
        submission_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::SubmissionId.eq(submission_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_reports_by_submission_and_type(
        &self,
        submission_id: Uuid,
        report_type: String,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::SubmissionId.eq(submission_id))
            .filter(Column::ReportType.eq(report_type))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_reports(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn update_report_status(
        &self,
        id: Uuid,
        status: String,
        data: Option<Value>,
    ) -> Result<Model, DbErr> {
        let report = self
            .get_report_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Report not found".to_string()))?;

        let mut report: ActiveModel = report.into();
        report.status = Set(status);
        if let Some(data) = data {
            report.data = Set(Some(data));
        }

        self.db_service.update(report).await
    }

    pub async fn delete_report(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_submission_reports_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_report = Model {
            report_id: Uuid::new_v4(),
            submission_id: Uuid::new_v4(),
            report_type: "sustainability".to_string(),
            status: "completed".to_string(),
            generated_at: Utc::now(),
            data: Some(json!({"score": 85, "feedback": "Good work"})),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_report.clone()], // create_report result
                vec![mock_report.clone()], // get_report_by_id result
                vec![mock_report.clone()], // get_reports_by_submission result
                vec![mock_report.clone()], // get_all_reports result
                vec![mock_report.clone()], // update_report_status internal get_report_by_id
                vec![mock_report.clone()], // update_report_status result
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let service = SubmissionReportsService::new(Arc::new(db));

        // Test create
        let report = service
            .create_report(
                mock_report.submission_id,
                "sustainability".to_string(),
                Some(json!({"score": 85, "feedback": "Good work"})),
            )
            .await?;

        assert_eq!(report.submission_id, mock_report.submission_id);

        // Test get by id
        let found = service.get_report_by_id(report.report_id).await?;
        assert!(found.is_some());

        // Test get by submission id
        let submission_reports = service
            .get_reports_by_submission(report.submission_id)
            .await?;
        assert!(!submission_reports.is_empty());

        // Test get all
        let all_reports = service.get_all_reports().await?;
        assert!(!all_reports.is_empty());

        // Test update status
        let updated = service
            .update_report_status(
                report.report_id,
                "completed".to_string(),
                Some(json!({"score": 90, "feedback": "Excellent work"})),
            )
            .await?;
        assert_eq!(updated.report_id, report.report_id);

        // Test delete
        let delete_result = service.delete_report(report.report_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
}
