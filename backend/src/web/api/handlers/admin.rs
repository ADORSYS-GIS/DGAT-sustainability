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
        let mut responses = Vec::new();
        if let Some(responses_array) = content_obj.get("responses").and_then(|r| r.as_array()) {
            for response_obj in responses_array.iter().filter_map(|r| r.as_object()) {
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

                // Extract question_revision_id
                let question_revision_id = response_obj
                    .get("question_revision_id")
                    .and_then(|id| id.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .unwrap_or_else(|| Uuid::new_v4()); // fallback to new UUID if parsing fails

                // Fetch question text and category using question_revision_id
                let (question_text, question_category) = match app_state
                    .database
                    .questions_revisions
                    .get_revision_by_id(question_revision_id)
                    .await
                {
                    Ok(Some(revision)) => {
                        // Get the question to fetch category
                        match app_state
                            .database
                            .questions
                            .get_question_by_id(revision.question_id)
                            .await
                        {
                            Ok(Some(question)) => {
                                // Extract text from JSON (assuming "en" language for now)
                                let text = revision
                                    .text
                                    .get("en")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("Unknown question")
                                    .to_string();
                                (text, question.category)
                            }
                            _ => ("Unknown question".to_string(), "Unknown".to_string()),
                        }
                    }
                    _ => ("Unknown question".to_string(), "Unknown".to_string()),
                };

                // Extract response as string
                let response = response_obj
                    .get("response")
                    .map(|r| {
                        if let Some(s) = r.as_str() {
                            s.to_string()
                        } else {
                            // If it's not a string, serialize it as JSON
                            serde_json::to_string(r).unwrap_or_else(|_| "".to_string())
                        }
                    })
                    .unwrap_or_else(|| "".to_string());

                // Extract version
                let version = response_obj
                    .get("version")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(1) as i32;

                responses.push(AdminResponseDetail {
                    question_text,
                    question_category,
                    response,
                    version,
                    files,
                });
            }
        }

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::database::entity::questions::QuestionsService;
    use crate::common::database::entity::questions_revisions::QuestionsRevisionsService;
    use sea_orm::{DatabaseBackend, MockDatabase};
    use serde_json::json;
    use uuid::Uuid;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_question_text_and_category_extraction() -> Result<(), Box<dyn std::error::Error>> {
        // Create mock question and revision data
        let question_id = Uuid::new_v4();
        let question_revision_id = Uuid::new_v4();

        let mock_question = crate::common::database::entity::questions::Model {
            question_id,
            category: "Environmental".to_string(),
            created_at: chrono::Utc::now(),
        };

        let mock_revision = crate::common::database::entity::questions_revisions::Model {
            question_revision_id,
            question_id,
            text: json!({"en": "What is your organization's sustainability policy?"}),
            weight: 1.0,
            created_at: chrono::Utc::now(),
        };

        // Create separate mock databases for each service
        let revision_db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![mock_revision.clone()]])
            .into_connection();

        let question_db = MockDatabase::new(DatabaseBackend::Postgres)
            .append_query_results([vec![mock_question.clone()]])
            .into_connection();

        let questions_service = QuestionsService::new(Arc::new(question_db));
        let questions_revisions_service = QuestionsRevisionsService::new(Arc::new(revision_db));

        // Test the logic that would be used in the handler
        let revision = questions_revisions_service
            .get_revision_by_id(question_revision_id)
            .await?;

        assert!(revision.is_some());
        let revision = revision.unwrap();

        let question = questions_service
            .get_question_by_id(revision.question_id)
            .await?;

        assert!(question.is_some());
        let question = question.unwrap();

        // Test the text extraction logic from the handler
        let text = revision
            .text
            .get("en")
            .and_then(|t| t.as_str())
            .unwrap_or("Unknown question")
            .to_string();

        let category = question.category;

        // Verify the expected values match the sample payload from the issue
        assert_eq!(text, "What is your organization's sustainability policy?");
        assert_eq!(category, "Environmental");

        println!("✓ Successfully extracted question_text: {}", text);
        println!("✓ Successfully extracted question_category: {}", category);

        Ok(())
    }
}
