use sea_orm::entity::prelude::*;
use uuid::Uuid;
use serde_json::Value;


#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "questions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub question_id: Uuid,
   pub text: Value,
    pub category: String,
    pub weight: f32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}