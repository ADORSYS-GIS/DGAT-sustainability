use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(
    rs_type = "String",
    db_type = "String(StringLen::None)",
    enum_name = "role_type"
)]
pub enum Role {
    #[sea_orm(string_value = "admin")]
    Admin,
    #[sea_orm(string_value = "user")]
    User,
    #[sea_orm(string_value = "manager")]
    Manager,
}

#[derive(Clone, Debug, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(
    rs_type = "String",
    db_type = "String(StringLen::None)",
    enum_name = "assessment_status"
)]
pub enum AssessmentStatus {
    #[sea_orm(string_value = "Draft")]
    Draft,
    #[sea_orm(string_value = "Submitted")]
    Submitted,
    #[sea_orm(string_value = "Completed")]
    Completed,
}

#[derive(Clone, Debug, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(
    rs_type = "String",
    db_type = "String(StringLen::None)",
    enum_name = "sync_status"
)]
pub enum SyncStatus {
    #[sea_orm(string_value = "pending")]
    Pending,
    #[sea_orm(string_value = "processing")]
    Processing,
    #[sea_orm(string_value = "completed")]
    Completed,
}

#[derive(Clone, Debug, PartialEq, EnumIter, DeriveActiveEnum)]
#[sea_orm(
    rs_type = "String",
    db_type = "String(StringLen::None)",
    enum_name = "report_type"
)]
pub enum ReportType {
    #[sea_orm(string_value = "PDF")]
    Pdf,
    #[sea_orm(string_value = "CSV")]
    Csv,
}
