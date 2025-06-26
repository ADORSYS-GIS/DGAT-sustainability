use sea_orm::entity::prelude::*;
use uuid::Uuid;
use serde_json::Value;
use crate::common::database::enums::AssessmentStatus;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    pub user_id: String,
    pub data: Value,
    pub status: AssessmentStatus,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::assessment_questions::Entity")]
    AssessmentQuestions,
    #[sea_orm(has_many = "super::sync_queue::Entity")]
    SyncQueue,
    #[sea_orm(has_many = "super::reports::Entity")]
    Reports,
}


impl Related<super::sync_queue::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SyncQueue.def()
    }
}

impl Related<super::reports::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reports.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}