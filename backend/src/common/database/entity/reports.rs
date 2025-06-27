use crate::common::database::enums::ReportType;
use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reports")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub report_id: Uuid,
    pub assessment_id: Uuid,
    pub type_: ReportType,
    pub data: Value,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::ReportId);

// Reports-specific service that extends the generic DatabaseService
pub struct ReportsService {
    db_service: DatabaseService<Entity>,
}

impl ReportsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    // Create a new report
    pub async fn create_report(
        &self,
        assessment_id: Uuid,
        type_: ReportType,
        data: Value,
    ) -> Result<Model, DbErr> {
        let report = ActiveModel {
            report_id: Set(Uuid::new_v4()),
            assessment_id: Set(assessment_id),
            type_: Set(type_),
            data: Set(data),
        };

        self.db_service.create(report).await
    }

    // Get all reports
    pub async fn get_all_reports(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    // Get report by ID
    pub async fn get_report_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    // Get reports by assessment ID
    pub async fn get_reports_by_assessment(
        &self,
        assessment_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .all(self.db_service.get_connection())
            .await
    }

    // Update report
    pub async fn update_report(
        &self,
        id: Uuid,
        data: Option<Value>,
        type_: Option<ReportType>,
    ) -> Result<Model, DbErr> {
        let report = self
            .get_report_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Report not found".to_string()))?;

        let mut report: ActiveModel = report.into();

        if let Some(data) = data {
            report.data = Set(data);
        }
        if let Some(type_) = type_ {
            report.type_ = Set(type_);
        }

        self.db_service.update(report).await
    }

    // Delete report
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
    async fn test_reports_service() -> Result<(), Box<dyn std::error::Error>> {
        // Predefine UUIDs for consistent testing
        // Using fixed UUIDs ensure all mock results reference the same report
        let report_id = Uuid::new_v4();
        let assessment_id = Uuid::new_v4();

        // Create a mock database
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // 1. Result for create_report (initial creation)
                vec![Model {
                    report_id,
                    assessment_id,
                    type_: ReportType::Pdf,
                    data: json!({"score": 85}),
                }],
                // 2. Result for get_report_by_id (read after creation)
                vec![Model {
                    report_id,
                    assessment_id,
                    type_: ReportType::Pdf,
                    data: json!({"score": 85}),
                }],
                // 3. Result for update_report
                vec![Model {
                    report_id,
                    assessment_id,
                    type_: ReportType::Pdf,
                    data: json!({"score": 90}),
                }],
                // 4. Result for get_reports_by_assessment
                vec![Model {
                    report_id,
                    assessment_id,
                    type_: ReportType::Pdf,
                    data: json!({"score": 90}),
                }],
                // 5. Result for get_report_by_id in delete_report (existence check before deletion)
                vec![Model {
                    report_id,
                    assessment_id,
                    type_: ReportType::Pdf,
                    data: json!({"score": 90}),
                }],
            ])
            .append_exec_results([
                // First exec result might be used by create/update operations if they perform writings
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                // Second exec result for the actual delete operation
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let reports_service = ReportsService::new(Arc::new(db));

        // Test create - verifies report creation works
        let report = reports_service
            .create_report(assessment_id, ReportType::Pdf, json!({"score": 85}))
            .await?;

        // Verify the report was created with correct data
        assert_eq!(report.assessment_id, assessment_id);
        assert_eq!(report.type_, ReportType::Pdf);
        assert_eq!(report.data, json!({"score": 85}));

        // Test read - verifies we can retrieve a report by ID
        let found = reports_service.get_report_by_id(report.report_id).await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.assessment_id, assessment_id);

        // Test update - verifies report updating works
        let updated = reports_service
            .update_report(
                report.report_id,
                Some(json!({"score": 90})),
                Some(ReportType::Pdf),
            )
            .await?;
        assert_eq!(updated.type_, ReportType::Pdf);
        assert_eq!(updated.data, json!({"score": 90}));

        // Test get reports by assessment - verifies filtering by assessment ID
        let assessment_reports = reports_service
            .get_reports_by_assessment(assessment_id)
            .await?;
        assert_eq!(assessment_reports.len(), 1);
        assert_eq!(assessment_reports[0].type_, ReportType::Pdf);

        // Test delete - verifies report deletion works
        let delete_result = reports_service.delete_report(report.report_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
    #[tokio::test]
    async fn test_report_not_found() -> Result<(), Box<dyn std::error::Error>> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<Model>::new()])
            .into_connection();

        let reports_service = ReportsService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = reports_service.get_report_by_id(non_existent_id).await?;
        assert!(result.is_none());

        let update_result = reports_service
            .update_report(
                non_existent_id,
                Some(json!({"score": 90})),
                Some(ReportType::Pdf),
            )
            .await;
        assert!(update_result.is_err());

        Ok(())
    }
}
