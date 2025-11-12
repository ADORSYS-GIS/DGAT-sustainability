use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create the assessment_categories join table
        manager
            .create_table(
                Table::create()
                    .table(AssessmentCategories::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AssessmentCategories::AssessmentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(AssessmentCategories::CategoryCatalogId)
                            .uuid()
                            .not_null(),
                    )
                    .primary_key(
                        Index::create()
                            .col(AssessmentCategories::AssessmentId)
                            .col(AssessmentCategories::CategoryCatalogId),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_categories_assessment_id")
                            .from(
                                AssessmentCategories::Table,
                                AssessmentCategories::AssessmentId,
                            )
                            .to(Assessments::Table, Assessments::AssessmentId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_categories_category_catalog_id")
                            .from(
                                AssessmentCategories::Table,
                                AssessmentCategories::CategoryCatalogId,
                            )
                            .to(CategoryCatalog::Table, CategoryCatalog::CategoryCatalogId)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Migrate data from the old assessments.categories column
        let db = manager.get_connection();
        db.execute_unprepared(
            "
            INSERT INTO assessment_categories (assessment_id, category_catalog_id)
            SELECT
                assessment_id,
                (jsonb_array_elements_text(categories)::uuid) AS category_catalog_id
            FROM
                assessments
            WHERE
                jsonb_typeof(categories) = 'array' AND jsonb_array_length(categories) > 0;
            ",
        )
        .await?;

        // Remove the old categories column from the assessments table
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .drop_column(Assessments::Categories)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add the categories column back to the assessments table
        manager
            .alter_table(
                Table::alter()
                    .table(Assessments::Table)
                    .add_column(
                        ColumnDef::new(Assessments::Categories)
                            .json_binary()
                            .default(serde_json::json!([]))
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Migrate data from the assessment_categories join table back to the assessments.categories column
        let db = manager.get_connection();
        db.execute_unprepared(
            "
            UPDATE
                assessments
            SET
                categories = (
                    SELECT
                        jsonb_agg(category_catalog_id)
                    FROM
                        assessment_categories
                    WHERE
                        assessment_id = assessments.assessment_id
                )
            WHERE
                EXISTS (
                    SELECT
                        1
                    FROM
                        assessment_categories
                    WHERE
                        assessment_id = assessments.assessment_id
                );
            ",
        )
        .await?;

        // Drop the assessment_categories join table
        manager
            .drop_table(Table::drop().table(AssessmentCategories::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Assessments {
    Table,
    AssessmentId,
    Categories,
}

#[derive(Iden)]
enum CategoryCatalog {
    Table,
    CategoryCatalogId,
}

#[derive(Iden)]
enum AssessmentCategories {
    Table,
    AssessmentId,
    CategoryCatalogId,
}