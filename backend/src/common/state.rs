use crate::common::database::entity::assessments::AssessmentsService;
use crate::common::database::entity::organization_categories::OrganizationCategoriesService;
use crate::common::database::entity::questions::QuestionsService;
use crate::common::database::entity::reports::ReportsService;
use crate::common::database::entity::sync_queue::SyncQueueService;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AppDatabase {
    conn: Arc<DatabaseConnection>,
    assessments: AssessmentsService,
    organization_categories: OrganizationCategoriesService,
    questions: QuestionsService,
    reports: ReportsService,
    sync_queue: SyncQueueService,
}

#[allow(dead_code)]
impl AppDatabase {
    pub async fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self {
            assessments: AssessmentsService::new(conn.clone()),
            organization_categories: OrganizationCategoriesService::new(conn.clone()),
            questions: QuestionsService::new(conn.clone()),
            reports: ReportsService::new(conn.clone()),
            sync_queue: SyncQueueService::new(conn.clone()),
            conn,
        }
    }
}
