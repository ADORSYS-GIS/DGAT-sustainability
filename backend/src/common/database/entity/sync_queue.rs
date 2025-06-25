use sea_orm::entity::prelude::*;
use uuid::Uuid;
use serde_json::Value;
use crate::common::database::enums::SyncStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "sync_queue")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub sync_id: Uuid,
    pub user_id: Uuid,
    pub assessment_id: Uuid,
    pub data: Value,
    pub status: SyncStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UserId",
        to = "super::users::Column::UserId"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessment,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}