use crate::common::database::entity::assessments::AssessmentsService;
use crate::common::database::entity::questions::QuestionsService;
use crate::common::database::entity::reports::ReportsService;
use crate::common::database::entity::sync_queue::SyncQueueService;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

pub struct AppDatabase {
    conn: Arc<DatabaseConnection>,
    assessments: AssessmentsService,
    questions: QuestionsService,
    reports: ReportsService,
    sync_queue: SyncQueueService,
}

impl AppDatabase {
    pub async fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self {
            assessments: AssessmentsService::new(conn.clone()),
            questions: QuestionsService::new(conn.clone()),
            reports: ReportsService::new(conn.clone()),
            sync_queue: SyncQueueService::new(conn.clone()),
            conn,
        }
    }
}
