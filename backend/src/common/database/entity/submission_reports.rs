use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "submission_reports")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub report_id: Uuid,
    pub assessment_id: Uuid,
    pub data: Value, // Report content as JSON
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments_submission::Entity",
        from = "Column::AssessmentId",
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

    pub async fn create_report(&self, assessment_id: Uuid, data: Value) -> Result<Model, DbErr> {
        let report = ActiveModel {
            report_id: Set(Uuid::new_v4()),
            assessment_id: Set(assessment_id),
            data: Set(data),
        };

        self.db_service.create(report).await
    }

    pub async fn get_report_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_report_by_assessment(
        &self,
        assessment_id: Uuid,
    ) -> Result<Option<Model>, DbErr> {
        Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .one(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_reports(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn update_report_data(&self, id: Uuid, data: Value) -> Result<Model, DbErr> {
        let report = self
            .get_report_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Report not found".to_string()))?;

        let mut report: ActiveModel = report.into();
        report.data = Set(data);

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
            assessment_id: Uuid::new_v4(),
            data: json!({"score": 85, "feedback": "Good work"}),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_report.clone()], // create_report result
                vec![mock_report.clone()], // get_report_by_id result
                vec![mock_report.clone()], // get_report_by_assessment result
                vec![mock_report.clone()], // get_all_reports result
                vec![mock_report.clone()], // update_report_data internal get_report_by_id
                vec![mock_report.clone()], // update_report_data result
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
                mock_report.assessment_id,
                json!({"score": 85, "feedback": "Good work"}),
            )
            .await?;

        assert_eq!(report.assessment_id, mock_report.assessment_id);

        // Test get by id
        let found = service.get_report_by_id(report.report_id).await?;
        assert!(found.is_some());

        // Test get by assessment id
        let assessment_report = service
            .get_report_by_assessment(report.assessment_id)
            .await?;
        assert!(assessment_report.is_some());

        // Test get all
        let all_reports = service.get_all_reports().await?;
        assert!(!all_reports.is_empty());

        // Test update
        let updated = service
            .update_report_data(
                report.report_id,
                json!({"score": 90, "feedback": "Excellent work"}),
            )
            .await?;
        assert_eq!(updated.report_id, report.report_id);

        // Test delete
        let delete_result = service.delete_report(report.report_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
}
