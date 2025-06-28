use crate::common::database::enums::SyncStatus;
use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use serde_json::Value;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "sync_queue")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub sync_id: Uuid,
    pub user_id: String,
    pub assessment_id: Uuid,
    pub data: Value,
    pub status: SyncStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::SyncId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct SyncQueueService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl SyncQueueService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    // Create a new sync queue entry
    pub async fn create_sync_entry(
        &self,
        user_id: String,
        assessment_id: Uuid,
        data: Value,
        status: SyncStatus,
    ) -> Result<Model, DbErr> {
        let sync_entry = ActiveModel {
            sync_id: Set(Uuid::new_v4()),
            user_id: Set(user_id),
            assessment_id: Set(assessment_id),
            data: Set(data),
            status: Set(status),
        };

        self.db_service.create(sync_entry).await
    }

    // Get all sync entries
    pub async fn get_all_sync_entries(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    // Get sync entry by ID
    pub async fn get_sync_entry_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    // Get sync entries by user ID
    pub async fn get_sync_entries_by_user(&self, user_id: &str) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .all(self.db_service.get_connection())
            .await
    }

    // Get sync entries by assessment ID
    pub async fn get_sync_entries_by_assessment(
        &self,
        assessment_id: Uuid,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::AssessmentId.eq(assessment_id))
            .all(self.db_service.get_connection())
            .await
    }

    // Get sync entries by status
    pub async fn get_sync_entries_by_status(
        &self,
        status: SyncStatus,
    ) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::Status.eq(status))
            .all(self.db_service.get_connection())
            .await
    }

    // Update sync entry
    pub async fn update_sync_entry(
        &self,
        id: Uuid,
        data: Option<Value>,
        status: Option<SyncStatus>,
    ) -> Result<Model, DbErr> {
        let sync_entry = self
            .get_sync_entry_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Sync entry not found".to_string()))?;

        let mut sync_entry: ActiveModel = sync_entry.into();

        if let Some(data) = data {
            sync_entry.data = Set(data);
        }
        if let Some(status) = status {
            sync_entry.status = Set(status);
        }

        self.db_service.update(sync_entry).await
    }

    // Delete sync entry
    pub async fn delete_sync_entry(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};
    use serde_json::json;
    #[tokio::test]
    async fn test_sync_queue_service() -> Result<(), Box<dyn std::error::Error>> {
        let sync_id = Uuid::new_v4();
        let assessment_id = Uuid::new_v4();
        let user_id = "test_user".to_string();
        let mock_result = Model {
            sync_id,
            user_id: user_id.clone(),
            assessment_id,
            data: json!({"key": "updated"}),
            status: SyncStatus::Completed,
        };
        let mock_pending_result = Model {
            sync_id,
            user_id: user_id.clone(),
            assessment_id,
            data: json!({"key": "updated"}),
            status: SyncStatus::Pending,
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                // Result for create_sync_entry
                vec![mock_pending_result.clone()],
                vec![mock_result.clone()],
                // Result for get_sync_entry_by_id
                vec![mock_result.clone()],
                // Result for update_sync_entry
                vec![mock_result.clone()],
                // Result for get_sync_entries_by_user
                vec![mock_result.clone()],
                vec![
                    mock_result.clone(),
                    mock_result.clone(),
                    mock_result.clone(),
                ],
                vec![mock_result],
            ])
            .append_exec_results([
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
                MockExecResult {
                    last_insert_id: 1,
                    rows_affected: 1,
                },
            ])
            .into_connection();

        let sync_service = SyncQueueService::new(Arc::new(db));

        // Test create
        let sync_entry = sync_service
            .create_sync_entry(
                user_id.clone(),
                assessment_id,
                json!({"key": "value"}),
                SyncStatus::Pending,
            )
            .await?;

        assert_eq!(sync_entry.user_id, user_id);
        assert_eq!(sync_entry.status, SyncStatus::Pending);

        // Test read
        let found = sync_service
            .get_sync_entry_by_id(sync_entry.sync_id)
            .await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.user_id, user_id);

        // Test update
        let updated = sync_service
            .update_sync_entry(
                sync_entry.sync_id,
                Some(json!({"key": "updated"})),
                Some(SyncStatus::Completed),
            )
            .await?;
        assert_eq!(updated.status, SyncStatus::Completed);
        assert_eq!(updated.data, json!({"key": "updated"}));

        // Test get by user
        let user_entries = sync_service.get_sync_entries_by_user(&user_id).await?;
        assert_eq!(user_entries.len(), 1);
        assert_eq!(user_entries[0].status, SyncStatus::Completed);

        // Test get all sync entries
        let all_entries = sync_service.get_all_sync_entries().await?;
        assert_eq!(all_entries.len(), 3);

        // Get sync entries by assessments
        let assessment_entries = sync_service
            .get_sync_entries_by_assessment(assessment_id)
            .await?;
        assert_eq!(assessment_entries.len(), 1);

        // Test delete
        let delete_result = sync_service.delete_sync_entry(sync_entry.sync_id).await?;
        assert_eq!(delete_result.rows_affected, 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_sync_entry_not_found() -> Result<(), Box<dyn std::error::Error>> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([Vec::<Model>::new()])
            .into_connection();

        let sync_service = SyncQueueService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = sync_service.get_sync_entry_by_id(non_existent_id).await?;
        assert!(result.is_none());

        let update_result = sync_service
            .update_sync_entry(
                non_existent_id,
                Some(json!({"key": "value"})),
                Some(SyncStatus::Completed),
            )
            .await;
        assert!(update_result.is_err());

        Ok(())
    }

    #[tokio::test]
    async fn test_get_sync_entries_by_status() -> Result<(), Box<dyn std::error::Error>> {
        let sync_id = Uuid::new_v4();
        let assessment_id = Uuid::new_v4();
        let user_id = "test_user".to_string();

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![Model {
                sync_id,
                user_id,
                assessment_id,
                data: json!({"key": "value"}),
                status: SyncStatus::Pending,
            }]])
            .into_connection();

        let sync_service = SyncQueueService::new(Arc::new(db));

        let pending_entries = sync_service
            .get_sync_entries_by_status(SyncStatus::Pending)
            .await?;
        assert_eq!(pending_entries.len(), 1);
        assert_eq!(pending_entries[0].status, SyncStatus::Pending);

        Ok(())
    }
}
