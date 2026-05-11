use sea_orm_migration::prelude::*;

mod m20250123_000014_create_categories_table;
mod m20250124_000016_create_category_catalog_table;
mod m20250124_000017_create_organization_categories_table;
mod m20250124_000018_migrate_categories_to_catalog;
mod m20250706_000001_create_questions_table;
mod m20250706_000002_create_questions_revisions_table;
mod m20250706_000003_create_assessments_table;
mod m20250706_000004_create_assessments_response_table;
mod m20250706_000005_create_file_table;
mod m20250706_000006_create_assessments_response_file_table;
mod m20250706_000007_create_assessments_submission_table;
mod m20250706_000008_create_submission_reports_table;
mod m20250706_000010_remove_assessment_submission_fk;
mod m20250715_000011_add_status_to_assessments_submission;
mod m20250715_000012_add_reviewed_at_to_assessments_submission;
mod m20250715_000013_update_submission_reports_table;
mod m20250731_000001_add_assessment_name;
mod m20250819_000015_create_temp_submission_table;
mod m20250916_000016_add_categories_to_assessments;
mod m20250917_000017_create_assessment_categories_join_table;
mod m20251010_082000_refactor_questions_category_link;
mod m20251104_153200_add_org_name_to_submissions;
mod m20260331_114000_add_is_active_to_questions;
mod m20260401_091000_add_display_order_to_questions;
mod m20260420_000001_create_user_category_assignments_table;
mod m20260420_000002_alter_user_category_assignments_use_id;
mod m20260424_000001_add_unique_constraint_assessments_submission;
mod m20260424_000002_add_unique_constraint_submission_reports;
mod m20260601_000001_add_translations_to_category_catalog;

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
            Box::new(m20250715_000011_add_status_to_assessments_submission::Migration),
            Box::new(m20250715_000012_add_reviewed_at_to_assessments_submission::Migration),
            Box::new(m20250715_000013_update_submission_reports_table::Migration),
            Box::new(m20250123_000014_create_categories_table::Migration),
            Box::new(m20250124_000016_create_category_catalog_table::Migration),
            Box::new(m20250124_000017_create_organization_categories_table::Migration),
            Box::new(m20250124_000018_migrate_categories_to_catalog::Migration),
            Box::new(m20250731_000001_add_assessment_name::Migration),
            Box::new(m20250819_000015_create_temp_submission_table::Migration),
            Box::new(m20250916_000016_add_categories_to_assessments::Migration),
            Box::new(m20250917_000017_create_assessment_categories_join_table::Migration),
            Box::new(m20251010_082000_refactor_questions_category_link::Migration),
            Box::new(m20251104_153200_add_org_name_to_submissions::Migration),
            Box::new(m20260331_114000_add_is_active_to_questions::Migration),
            Box::new(m20260401_091000_add_display_order_to_questions::Migration),
            Box::new(m20260420_000001_create_user_category_assignments_table::Migration),
            Box::new(m20260420_000002_alter_user_category_assignments_use_id::Migration),
            Box::new(m20260424_000001_add_unique_constraint_assessments_submission::Migration),
            Box::new(m20260424_000002_add_unique_constraint_submission_reports::Migration),
            Box::new(m20260601_000001_add_translations_to_category_catalog::Migration),
        ]
    }
}
