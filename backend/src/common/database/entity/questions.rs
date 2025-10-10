use crate::common::entitytrait::{DatabaseEntity, DatabaseService};
use crate::impl_database_entity;
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use sea_orm::{DeleteResult, Set};
use std::sync::Arc;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "questions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub question_id: Uuid,
    pub category_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::questions_revisions::Entity")]
    QuestionsRevisions,
    #[sea_orm(
        belongs_to = "super::category_catalog::Entity",
        from = "Column::CategoryId",
        to = "super::category_catalog::Column::CategoryCatalogId"
    )]
    CategoryCatalog,
}

impl Related<super::questions_revisions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::QuestionsRevisions.def()
    }
}

impl Related<super::category_catalog::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CategoryCatalog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl_database_entity!(Entity, Column::QuestionId);

#[allow(dead_code)]
#[derive(Clone)]
pub struct QuestionsService {
    db_service: DatabaseService<Entity>,
}

#[allow(dead_code)]
impl QuestionsService {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            db_service: DatabaseService::new(db),
        }
    }

    pub async fn create_question(&self, category_id: Uuid) -> Result<Model, DbErr> {
        let question = ActiveModel {
            question_id: Set(Uuid::new_v4()),
            category_id: Set(category_id),
            created_at: Set(Utc::now()),
        };

        self.db_service.create(question).await
    }

    pub async fn get_question_by_id(&self, id: Uuid) -> Result<Option<Model>, DbErr> {
        self.db_service.find_by_id(id).await
    }

    pub async fn get_questions_by_category(&self, category_id: Uuid) -> Result<Vec<Model>, DbErr> {
        Entity::find()
            .filter(Column::CategoryId.eq(category_id))
            .all(self.db_service.get_connection())
            .await
    }

    pub async fn get_all_questions(&self) -> Result<Vec<Model>, DbErr> {
        self.db_service.find_all().await
    }

    pub async fn update_question(
        &self,
        id: Uuid,
        category_id: Option<Uuid>,
    ) -> Result<Model, DbErr> {
        let question = self
            .get_question_by_id(id)
            .await?
            .ok_or(DbErr::Custom("Question not found".to_string()))?;

        let mut question: ActiveModel = question.into();

        if let Some(category_id) = category_id {
            question.category_id = Set(category_id);
        }

        self.db_service.update(question).await
    }

    pub async fn delete_question(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        self.db_service.delete(id).await
    }

    pub async fn delete_questions_by_category_id(
        &self,
        category_id: Uuid,
        txn: Option<&sea_orm::DatabaseTransaction>,
    ) -> Result<DeleteResult, DbErr> {
        let query = Entity::delete_many().filter(Column::CategoryId.eq(category_id));

        if let Some(txn) = txn {
            query.exec(txn).await
        } else {
            query.exec(self.db_service.get_connection()).await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

    #[tokio::test]
    async fn test_questions_service() -> Result<(), Box<dyn std::error::Error>> {
        let mock_question = Model {
            question_id: Uuid::new_v4(),
            category_id: Uuid::new_v4(),
            created_at: Utc::now(),
        };

        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([
                vec![mock_question.clone()],
                vec![mock_question.clone()],
                vec![mock_question.clone()],
                vec![mock_question.clone()],
                vec![mock_question.clone()],
            ])
            .append_exec_results([MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .into_connection();

        let questions_service = QuestionsService::new(Arc::new(db));

        // Test create
        let question = questions_service
            .create_question(mock_question.category_id)
            .await?;

        assert_eq!(question.category_id, mock_question.category_id);

        // Test get all questions
        let questions = questions_service.get_all_questions().await?;
        assert!(!questions.is_empty());

        // Test get by id
        let found = questions_service
            .get_question_by_id(question.question_id)
            .await?;
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.category_id, question.category_id);

        // Test delete question
        let delete_result = questions_service
            .delete_question(question.question_id)
            .await?;
        assert_eq!(delete_result.rows_affected, 1);

        // Test get by category
        let category_questions = questions_service
            .get_questions_by_category(mock_question.category_id)
            .await?;
        assert!(!category_questions.is_empty());
        assert_eq!(category_questions[0].category_id, mock_question.category_id);

        Ok(())
    }

    #[tokio::test]
    async fn test_question_not_found() -> Result<(), Box<dyn std::error::Error>> {
        let db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results::<Model, _, _>([vec![]])
            .into_connection();

        let questions_service = QuestionsService::new(Arc::new(db));

        let non_existent_id = Uuid::new_v4();
        let result = questions_service
            .get_question_by_id(non_existent_id)
            .await?;
        assert!(result.is_none());

        Ok(())
    }
}
