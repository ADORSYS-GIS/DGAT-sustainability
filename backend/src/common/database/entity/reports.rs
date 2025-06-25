use sea_orm::entity::prelude::*;
use uuid::Uuid;
use serde_json::Value;
use crate::enums::ReportType;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reports")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub report_id: Uuid,
    pub assessment_id: Uuid,
    pub type_: ReportType,
    pub data: Value,
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