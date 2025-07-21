use sea_orm_migration::prelude::*;

mod m20250706_000001_create_questions_table;
mod m20250706_000002_create_questions_revisions_table;
mod m20250706_000003_create_assessments_table;
mod m20250706_000004_create_assessments_response_table;
mod m20250706_000005_create_file_table;
mod m20250706_000006_create_assessments_response_file_table;
mod m20250706_000007_create_assessments_submission_table;
mod m20250706_000008_create_submission_reports_table;
mod m20250706_000010_remove_assessment_submission_fk;
mod m20250706_000011_update_assessments_add_org_id;
mod m20250715_000011_add_status_to_assessments_submission;
mod m20250715_000012_add_reviewed_at_to_assessments_submission;
mod m20250715_000013_update_submission_reports_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250706_000001_create_questions_table::Migration),
            Box::new(m20250706_000002_create_questions_revisions_table::Migration),
            Box::new(m20250706_000003_create_assessments_table::Migration),
            Box::new(m20250706_000004_create_assessments_response_table::Migration),
            Box::new(m20250706_000005_create_file_table::Migration),
            Box::new(m20250706_000006_create_assessments_response_file_table::Migration),
            Box::new(m20250706_000007_create_assessments_submission_table::Migration),
            Box::new(m20250706_000008_create_submission_reports_table::Migration),
            Box::new(m20250706_000010_remove_assessment_submission_fk::Migration),
            Box::new(m20250706_000011_update_assessments_add_org_id::Migration),
            Box::new(m20250715_000011_add_status_to_assessments_submission::Migration),
            Box::new(m20250715_000012_add_reviewed_at_to_assessments_submission::Migration),
            Box::new(m20250715_000013_update_submission_reports_table::Migration),
        ]
    }
}
