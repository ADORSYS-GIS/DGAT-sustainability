use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20240625_000001_create_enums"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_type(Type::create().as_enum("assessment_status", &["Draft", "Submitted", "Completed"]).to_owned())
            .await?;
        manager
            .create_type(Type::create().as_enum("sync_status", &["pending", "processing", "completed"]).to_owned())
            .await?;
        manager
            .create_type(Type::create().as_enum("report_type", &["PDF", "CSV"]).to_owned())
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_type(Type::drop().name("assessment_status").to_owned()).await?;
        manager.drop_type(Type::drop().name("sync_status").to_owned()).await?;
        manager.drop_type(Type::drop().name("report_type").to_owned()).await?;
        Ok(())
    }
}

pub struct Migration2;

impl MigrationName for Migration2 {
    fn name(&self) -> &str {
        "m20240625_000002_create_tables"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration2 {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table("organizations")
                    .if_not_exists()
                    .col(ColumnDef::new("organization_id").uuid().not_null().primary_key())
                    .col(ColumnDef::new("name").string().not_null())
                    .col(ColumnDef::new("country").string().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("assessments")
                    .if_not_exists()
                    .col(ColumnDef::new("assessment_id").uuid().not_null().primary_key())
                    .col(ColumnDef::new("user_id").string().not_null()) // VARCHAR for Keycloak sub
                    .col(ColumnDef::new("data").json_binary().not_null()) // Answers
                    .col(ColumnDef::new("status").custom("assessment_status").not_null())
                    .index(Index::create().name("idx_assessments_user_id").table("assessments").col("user_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("questions")
                    .if_not_exists()
                    .col(ColumnDef::new("question_id").uuid().not_null().primary_key())
                    .col(ColumnDef::new("text").json_binary().not_null())
                    .col(ColumnDef::new("category").string().not_null())
                    .col(ColumnDef::new("weight").float().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("assessment_questions")
                    .if_not_exists()
                    .col(ColumnDef::new("assessment_id").uuid().not_null())
                    .col(ColumnDef::new("question_id").uuid().not_null())
                    .col(ColumnDef::new("answer").json_binary().not_null())
                    .primary_key(
                        Index::create()
                            .name("pk_assessment_questions")
                            .col("assessment_id")
                            .col("question_id")
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_questions_assessment")
                            .from("assessment_questions", "assessment_id")
                            .to("assessments", "assessment_id")
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assessment_questions_question")
                            .from("assessment_questions", "question_id")
                            .to("questions", "question_id")
                    )
                    .index(Index::create().name("idx_assessment_questions_assessment_id").table("assessment_questions").col("assessment_id"))
                    .index(Index::create().name("idx_assessment_questions_question_id").table("assessment_questions").col("question_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("sync_queue")
                    .if_not_exists()
                    .col(ColumnDef::new("sync_id").uuid().not_null().primary_key())
                    .col(ColumnDef::new("user_id").string().not_null()) // VARCHAR for Keycloak sub
                    .col(ColumnDef::new("assessment_id").uuid().not_null())
                    .col(ColumnDef::new("data").json_binary().not_null()) // Changed fields
                    .col(ColumnDef::new("status").custom("sync_status").not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sync_queue_assessment")
                            .from("sync_queue", "assessment_id")
                            .to("assessments", "assessment_id")
                    )
                    .index(Index::create().name("idx_sync_queue_user_id").table("sync_queue").col("user_id"))
                    .index(Index::create().name("idx_sync_queue_assessment_id").table("sync_queue").col("assessment_id"))
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table("reports")
                    .if_not_exists()
                    .col(ColumnDef::new("report_id").uuid().not_null().primary_key())
                    .col(ColumnDef::new("assessment_id").uuid().not_null())
                    .col(ColumnDef::new("type").custom("report_type").not_null())
                    .col(ColumnDef::new("data").json_binary().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_reports_assessment")
                            .from("reports", "assessment_id")
                            .to("assessments", "assessment_id")
                    )
                    .index(Index::create().name("idx_reports_assessment_id").table("reports").col("assessment_id"))
                    .to_owned(),
            )
            .await?;

// Add GIN indexes for JSONB fields
        manager
            .create_index(
                Index::create()
                    .name("idx_assessments_data_gin")
                    .table("assessments")
                    .col("data")
                    .index_type(IndexType::Gin)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_questions_text_gin")
                    .table("questions")
                    .col("text")
                    .index_type(IndexType::Gin)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_assessment_questions_answer_gin")
                    .table("assessment_questions")
                    .col("answer")
                    .index_type(IndexType::Gin)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_queue_data_gin")
                    .table("sync_queue")
                    .col("data")
                    .index_type(IndexType::Gin)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_reports_data_gin")
                    .table("reports")
                    .col("data")
                    .index_type(IndexType::Gin)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table("reports").to_owned()).await?;
        manager.drop_table(Table::drop().table("sync_queue").to_owned()).await?;
        manager.drop_table(Table::drop().table("assessment_questions").to_owned()).await?;
        manager.drop_table(Table::drop().table("questions").to_owned()).await?;
        manager.drop_table(Table::drop().table("assessments").to_owned()).await?;
        manager.drop_table(Table::drop().table("organizations").to_owned()).await?;
        Ok(())
    }
}