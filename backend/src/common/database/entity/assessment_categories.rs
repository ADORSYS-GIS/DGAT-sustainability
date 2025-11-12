use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "assessment_categories")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub assessment_id: Uuid,
    #[sea_orm(primary_key, auto_increment = false)]
    pub category_catalog_id: Uuid,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::assessments::Entity",
        from = "Column::AssessmentId",
        to = "super::assessments::Column::AssessmentId"
    )]
    Assessments,
    #[sea_orm(
        belongs_to = "super::category_catalog::Entity",
        from = "Column::CategoryCatalogId",
        to = "super::category_catalog::Column::CategoryCatalogId"
    )]
    CategoryCatalog,
}

impl ActiveModelBehavior for ActiveModel {}

impl Related<super::assessments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assessments.def()
    }
}

impl Related<super::category_catalog::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CategoryCatalog.def()
    }
}