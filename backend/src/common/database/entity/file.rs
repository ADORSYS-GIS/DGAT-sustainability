use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "file")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub file_id: Uuid,
    pub content: Vec<u8>, // Binary content
    pub metadata: Value,  // JSON metadata
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::assessments_response_file::Entity")]
    AssessmentsResponseFile,
}

impl Related<super::assessments_response_file::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AssessmentsResponseFile.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::FileId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct FileService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl FileService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_file(&self, content: Vec<u8>, metadata: Value) -> Result<Model, DbErr> {
        let file = ActiveModel {
            file_id: Set(Uuid::new_v4()),
            content: Set(content),
            metadata: Set(metadata),
        };

        self.db_service.create(file).await
    }

    pub async fn get_file_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn delete_file(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }

    pub async fn update_file_metadata(&self, id: Uuid, metadata: Value) -> Result<Model, DbErr> {
        let file = self
            .get_file_by_id(id)
            .await?
            .ok_or(DbErr::Custom("File not found".to_string()))?;

        let mut file: ActiveModel = file.into();
        file.metadata = Set(metadata);

        self.db_service.update(file).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;

    #[tokio::test]
    async fn test_file_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_file = Model {
            file_id: Uuid::new_v4(),
            content: vec![1, 2, 3, 4], // Sample binary data
            metadata: json!({"filename": "test.pdf", "size": 1024}),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_file.clone()], // create_file result
                vec![mock_file.clone()], // get_file_by_id result
                vec![mock_file.clone()], // update_file_metadata internal get_file_by_id
                vec![mock_file.clone()], // update_file_metadata result
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let service = FileService::new(Arc::new(db));

        // Test create
        let file = service
            .create_file(
                vec![1, 2, 3, 4],
                json!({"filename": "test.pdf", "size": 1024}),
            )
            .await?;

        assert_eq!(file.content, vec![1, 2, 3, 4]);

        // Test get by id
        let found = service.get_file_by_id(file.file_id).await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.file_id, file.file_id);

        // Test update metadata
        let updated = service
            .update_file_metadata(
                file.file_id,
                json!({"filename": "updated.pdf", "size": 2048}),
            )
            .await?;
        assert_eq!(updated.file_id, file.file_id);

        // Test delete
        let delete_result = service.delete_file(file.file_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }
}
