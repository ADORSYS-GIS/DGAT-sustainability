use crate::common::database::entity::assessments::AssessmentsService;
use crate::common::database::entity::assessments_response::AssessmentsResponseService;
use crate::common::database::entity::assessments_response_file::AssessmentsResponseFileService;
use crate::common::database::entity::assessments_submission::AssessmentsSubmissionService;
use crate::common::database::entity::file::FileService;
use crate::common::database::entity::questions::QuestionsService;
use crate::common::database::entity::questions_revisions::QuestionsRevisionsService;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AppDatabase {
    conn: Arc<DatabaseConnection>,
    assessments: AssessmentsService,
    assessments_response: AssessmentsResponseService,
    assessments_submission: AssessmentsSubmissionService,
    assessments_response_file: AssessmentsResponseFileService,
    file: FileService,
    questions: QuestionsService,
    questions_revisions: QuestionsRevisionsService,
}

#[allow(dead_code)]
impl AppDatabase {
    pub async fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self {
            assessments: AssessmentsService::new(conn.clone()),
            assessments_response: AssessmentsResponseService::new(conn.clone()),
            assessments_submission: AssessmentsSubmissionService::new(conn.clone()),
            assessments_response_file: AssessmentsResponseFileService::new(conn.clone()),
            file: FileService::new(conn.clone()),
            questions: QuestionsService::new(conn.clone()),
            questions_revisions: QuestionsRevisionsService::new(conn.clone()),
            conn,
        }
    }
}
