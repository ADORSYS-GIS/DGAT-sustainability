use crate::common::database::entity::assessments::AssessmentsService;
use crate::common::database::entity::assessments_response::AssessmentsResponseService;
use crate::common::database::entity::assessments_response_file::AssessmentsResponseFileService;
use crate::common::database::entity::assessments_submission::AssessmentsSubmissionService;
use crate::common::database::entity::categories::CategoriesService;
use crate::common::database::entity::category_catalog::CategoryCatalogService;
use crate::common::database::entity::file::FileService;
use crate::common::database::entity::organization_categories::OrganizationCategoriesService;
use crate::common::database::entity::questions::QuestionsService;
use crate::common::database::entity::questions_revisions::QuestionsRevisionsService;
use crate::common::database::entity::submission_reports::SubmissionReportsService;
use crate::common::database::entity::temp_submission::TempSubmissionService;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

#[derive(Clone)]
#[allow(dead_code)]
pub struct AppDatabase {
    conn: Arc<DatabaseConnection>,
    pub assessments: Arc<AssessmentsService>,
    pub assessments_response: AssessmentsResponseService,
    pub assessments_submission: AssessmentsSubmissionService,
    pub assessments_response_file: AssessmentsResponseFileService,
    pub categories: CategoriesService,
    pub category_catalog: CategoryCatalogService,
    pub file: FileService,
    pub organization_categories: OrganizationCategoriesService,
    pub questions: QuestionsService,
    pub questions_revisions: QuestionsRevisionsService,
    pub submission_reports: SubmissionReportsService,
    pub temp_submission: TempSubmissionService,
}

#[allow(dead_code)]
impl AppDatabase {
    pub async fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self {
            assessments: AssessmentsService::new(conn.clone()),
            assessments_response: AssessmentsResponseService::new(conn.clone()),
            assessments_submission: AssessmentsSubmissionService::new(conn.clone()),
            assessments_response_file: AssessmentsResponseFileService::new(conn.clone()),
            categories: CategoriesService::new(conn.clone()),
            category_catalog: CategoryCatalogService::new(conn.clone()),
            file: FileService::new(conn.clone()),
            organization_categories: OrganizationCategoriesService::new(conn.clone()),
            questions: QuestionsService::new(conn.clone()),
            questions_revisions: QuestionsRevisionsService::new(conn.clone()),
            submission_reports: SubmissionReportsService::new(conn.clone()),
            temp_submission: TempSubmissionService::new(conn.clone()),
            conn,
        }
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        &self.conn
    }
}

#[derive(Clone)]
pub struct AppState {
    pub database: AppDatabase,
}

impl AppState {
    pub async fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self {
            database: AppDatabase::new(conn).await,
        }
    }
}
