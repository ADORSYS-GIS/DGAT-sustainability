use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, JoinType, QuerySelect, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments_response_file")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub response_id: Uuid,
    #[sea_orm(primary_key)]
    pub file_id: Uuid,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments_response::Entity",
        from = "Column::ResponseId",
        to = "super::assessments_response::Column::ResponseId"
    )]
    AssessmentsResponse,
    #[sea_orm(
        belongs_to = "super::file::Entity",
        from = "Column::FileId",
        to = "super::file::Column::Id"
    )]
    File,
}

impl Related<super::assessments_response::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsResponse.def()
    }
}

impl Related<super::file::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::File.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[allow(dead_code)]
#[derive(Clone)]
pub struct AssessmentsResponseFileService {
    db: Arc<DatabaseConnection>,
}

#[allow(dead_code)]
impl AssessmentsResponseFileService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn link_file_to_response(
        &self,
        response_id: Uuid,
        file_id: Uuid,
    ) -> Result<Model, DbErr> {
        let response_file = ActiveModel {
            response_id: Set(response_id),
            file_id: Set(file_id),
        };

        response_file.insert(self.db.as_ref()).await
    }

    pub async fn get_files_for_response(
        &self,
        response_id: Uuid,
    ) -> Result<Vec<super::file::Model>, DbErr> {
        // Find all files linked to a response
        Entity::find()
            .filter(Column::ResponseId.eq(response_id))
            .find_also_related(super::file::Entity)
            .all(self.db.as_ref())
            .await
            .map(|results| {
                results
                    .into_iter()
                    .filter_map(|(_, file)| file)
                    .collect()
            })
    }

    pub async fn get_responses_for_file(
        &self,
        file_id: Uuid,
    ) -> Result<Vec<super::assessments_response::Model>, DbErr> {
        // Find all responses linked to a file
        super::assessments_response::Entity::find()
            .join(
                JoinType::InnerJoin,
                Relation::AssessmentsResponse.def().rev(),
            )
            .filter(Column::FileId.eq(file_id))
            .all(self.db.as_ref())
            .await
    }

    pub async fn unlink_file_from_response(
        &self,
        response_id: Uuid,
        file_id: Uuid,
    ) -> Result<DeleteResult, DbErr> {
        Entity::delete_many()
            .filter(Column::ResponseId.eq(response_id))
            .filter(Column::FileId.eq(file_id))
            .exec(self.db.as_ref())
            .await
    }

    pub async fn unlink_all_files_from_response(
        &self,
        response_id: Uuid,
    ) -> Result<DeleteResult, DbErr> {
        Entity::delete_many()
            .filter(Column::ResponseId.eq(response_id))
            .exec(self.db.as_ref())
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::database::entity::assessments_response;
    use crate::common::database::entity::file;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

    #[tokio::test]
    async fn test_assessments_response_file_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_response_file = Model {
            response_id: Uuid::new_v4(),
            file_id: Uuid::new_v4(),
        };

        let mock_file = file::Model {
            id: mock_response_file.file_id,
            content: vec![1, 2, 3, 4],
            metadata: serde_json::json!({"filename": "test.pdf"}),
        };

        let mock_response = assessments_response::Model {
            response_id: mock_response_file.response_id,
            assessment_id: Uuid::new_v4(),
            question_revision_id: Uuid::new_v4(),
            response: "test answer".to_string(),
            version: 1,
            updated_at: chrono::Utc::now(),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![mock_response_file.clone()]]) // link_file_to_response result
            .append_query_results([vec![mock_file.clone()]]) // get_files_for_response result
            .append_query_results([vec![mock_response.clone()]]) // get_responses_for_file result
            .append_exec_results([
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                MockExecResult {
                    last_insert_id: 0,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let service = AssessmentsResponseFileService::new(Arc::new(db));

        // Test link file to response
        let link = service
            .link_file_to_response(mock_response_file.response_id, mock_response_file.file_id)
            .await?;

        assert_eq!(link.response_id, mock_response_file.response_id);
        assert_eq!(link.file_id, mock_response_file.file_id);

        // Test get files for response
        let files = service
            .get_files_for_response(mock_response_file.response_id)
            .await?;
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].id, mock_response_file.file_id);

        // Test get responses for file
        let responses = service
            .get_responses_for_file(mock_response_file.file_id)
            .await?;
        assert_eq!(responses.len(), 1);
        assert_eq!(responses[0].response_id, mock_response_file.response_id);

        // Test unlink file
        let unlink_result = service
            .unlink_file_from_response(mock_response_file.response_id, mock_response_file.file_id)
            .await?;
        assert_eq!(unlink_result.rows_affected, 1);

        Ok(())
    }
}
