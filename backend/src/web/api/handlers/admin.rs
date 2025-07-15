use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{
    AdminAssessmentInfo, AdminResponseDetail, AdminSubmissionContent, AdminSubmissionDetail,
    AdminSubmissionListResponse,
};
use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ListSubmissionsQuery {
    status: Option<String>,
}

pub async fn list_all_submissions(
    State(app_state): State<AppState>,
    Query(params): Query<ListSubmissionsQuery>,
) -> Result<Json<AdminSubmissionListResponse>, ApiError> {
    // Fetch all submissions from the database
    let submission_models = app_state
        .database
        .assessments_submission
        .get_all_submissions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submissions: {e}")))?;

    // Convert database models to API models
    let mut submissions = Vec::new();
    for model in submission_models {
        // Parse the content to extract assessment and responses information
        let default_map = serde_json::Map::new();
        let content_obj = model.content.as_object().unwrap_or(&default_map);
        println!("{:#?}", content_obj);

        // Extract assessment info
        let assessment_info = content_obj
            .get("assessment")
            .and_then(|a| a.as_object())
            .map(|a| AdminAssessmentInfo {
                assessment_id: a
                    .get("assessment_id")
                    .and_then(|id| id.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .unwrap_or(model.submission_id),
                language: a
                    .get("language")
                    .and_then(|l| l.as_str())
                    .unwrap_or("en")
                    .to_string(),
            })
            .unwrap_or(AdminAssessmentInfo {
                assessment_id: model.submission_id,
                language: "en".to_string(),
            });

        // Extract responses info
        let responses = content_obj
            .get("responses")
            .and_then(|r| r.as_array())
            .map(|responses_array| {
                responses_array
                    .iter()
                    .filter_map(|r| r.as_object())
                    .map(|response_obj| {
                        // Extract file metadata from the response
                        let files = response_obj
                            .get("files")
                            .and_then(|f| f.as_array())
                            .map(|files_array| {
                                files_array
                                    .iter()
                                    .filter_map(|f| f.as_object())
                                    .filter_map(|file_obj| {
                                        // Convert JSON file metadata to FileMetadata struct
                                        let file_id = file_obj
                                            .get("file_id")
                                            .and_then(|id| id.as_str())
                                            .and_then(|s| Uuid::parse_str(s).ok())?;

                                        Some(crate::web::api::models::FileMetadata {
                                            file_id,
                                            filename: file_obj
                                                .get("filename")
                                                .and_then(|f| f.as_str())
                                                .unwrap_or("unknown")
                                                .to_string(),
                                            size: file_obj
                                                .get("size")
                                                .and_then(|s| s.as_i64())
                                                .unwrap_or(0),
                                            content_type: file_obj
                                                .get("content_type")
                                                .and_then(|ct| ct.as_str())
                                                .unwrap_or("application/octet-stream")
                                                .to_string(),
                                            created_at: file_obj
                                                .get("created_at")
                                                .and_then(|ca| ca.as_str())
                                                .unwrap_or(&chrono::Utc::now().to_rfc3339())
                                                .to_string(),
                                            metadata: file_obj.get("metadata").cloned(),
                                        })
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();

                        // Parse response - it could be a string or an array
                        let response = response_obj
                            .get("response")
                            .map(|r| {
                                if let Some(arr) = r.as_array() {
                                    // If it's already an array, convert to Vec<String>
                                    arr.iter()
                                        .filter_map(|v| v.as_str())
                                        .map(|s| s.to_string())
                                        .collect()
                                } else if let Some(s) = r.as_str() {
                                    // If it's a string, try to parse as JSON array first
                                    serde_json::from_str::<Vec<String>>(s)
                                        .unwrap_or_else(|_| vec![s.to_string()])
                                } else {
                                    vec!["".to_string()]
                                }
                            })
                            .unwrap_or_else(|| vec!["".to_string()]);

                        AdminResponseDetail {
                            question_text: response_obj
                                .get("question_text")
                                .and_then(|q| q.as_str())
                                .unwrap_or("Question text not available")
                                .to_string(),
                            question_category: response_obj
                                .get("question_category")
                                .and_then(|c| c.as_str())
                                .unwrap_or("General")
                                .to_string(),
                            response,
                            files,
                        }
                    })
                    .collect()
            })
            .unwrap_or_else(Vec::new);

        let submission = AdminSubmissionDetail {
            submission_id: model.submission_id,
            assessment_id: model.submission_id,
            user_id: model.user_id,
            content: AdminSubmissionContent {
                assessment: assessment_info,
                responses,
            },
            review_status: model.status.to_string(),
            submitted_at: model.submitted_at.to_rfc3339(),
            reviewed_at: model.reviewed_at.map(|dt| dt.to_rfc3339()),
        };

        // Apply status filter if provided
        if let Some(status) = &params.status {
            if submission.review_status == *status {
                submissions.push(submission);
            }
        } else {
            submissions.push(submission);
        }
    }

    Ok(Json(AdminSubmissionListResponse { submissions }))
}
