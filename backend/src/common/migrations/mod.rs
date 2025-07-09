use sea_orm_migration::prelude::*;

mod m20250706_000001_create_questions_table;
mod m20250706_000002_create_questions_revisions_table;
mod m20250706_000003_create_assessments_table;
mod m20250706_000004_create_assessments_response_table;
mod m20250706_000005_create_file_table;
mod m20250706_000006_create_assessments_response_file_table;
mod m20250706_000007_create_assessments_submission_table;
mod m20250706_000008_create_submission_reports_table;
mod m20250706_000009_add_unique_version_constraint;

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
            Box::new(m20250706_000009_add_unique_version_constraint::Migration),
        ]
    }
}
