use crate::web::api::error::ApiError;
use crate::web::api::models::{
    AdminSubmissionListResponse, AdminSubmissionDetail, AdminSubmissionContent, 
    AdminAssessmentInfo, AdminResponseDetail, AdminReviewListResponse, AdminReview, 
    AssignReviewerRequest, ReviewAssignmentResponse
};
use crate::common::state::AppState;
use axum::{extract::{Query, State}, Json};
use serde::Deserialize;
use uuid::Uuid;
use chrono::Utc;

#[derive(Deserialize)]
pub struct ListSubmissionsQuery {
    status: Option<String>,

}

pub async fn list_all_submissions(
    State(app_state): State<AppState>,
    Query(params): Query<ListSubmissionsQuery>,
) -> Result<Json<AdminSubmissionListResponse>, ApiError> {
    // Fetch all submissions from the database
    let submission_models = app_state.database.assessments_submission
        .get_all_submissions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submissions: {}", e)))?;

    // Convert database models to API models
    let mut submissions = Vec::new();
    for model in submission_models {
        // Parse the content to extract assessment and responses information
        let default_map = serde_json::Map::new();
        let content_obj = model.content.as_object().unwrap_or(&default_map);

        // Extract assessment info
        let assessment_info = content_obj.get("assessment")
            .and_then(|a| a.as_object())
            .map(|a| AdminAssessmentInfo {
                assessment_id: a.get("assessment_id")
                    .and_then(|id| id.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .unwrap_or(model.assessment_id),
                language: a.get("language")
                    .and_then(|l| l.as_str())
                    .unwrap_or("en")
                    .to_string(),
            })
            .unwrap_or(AdminAssessmentInfo {
                assessment_id: model.assessment_id,
                language: "en".to_string(),
            });

        // Extract responses info
        let responses = content_obj.get("responses")
            .and_then(|r| r.as_array())
            .map(|responses_array| {
                responses_array.iter()
                    .filter_map(|r| r.as_object())
                    .map(|response_obj| AdminResponseDetail {
                        question_text: response_obj.get("question_text")
                            .and_then(|q| q.as_str())
                            .unwrap_or("Question text not available")
                            .to_string(),
                        question_category: response_obj.get("question_category")
                            .and_then(|c| c.as_str())
                            .unwrap_or("General")
                            .to_string(),
                        response: response_obj.get("response")
                            .and_then(|r| r.as_str())
                            .unwrap_or("")
                            .to_string(),
                        files: vec![], // Files would be populated from database if needed
                    })
                    .collect()
            })
            .unwrap_or_else(Vec::new);

        let submission = AdminSubmissionDetail {
            submission_id: model.assessment_id, // Using assessment_id as submission_id
            assessment_id: model.assessment_id,
            user_id: model.user_id,
            content: AdminSubmissionContent {
                assessment: assessment_info,
                responses,
            },
            review_status: "pending_review".to_string(), // In real implementation, this would come from a status field
            submitted_at: chrono::Utc::now().to_rfc3339(), // In real implementation, this would come from a timestamp field
            reviewed_at: None, // In real implementation, this would come from a timestamp field
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

#[derive(Deserialize)]
pub struct ListReviewsQuery {
    status: Option<String>,
}

pub async fn list_all_reviews(
    State(_app_state): State<AppState>,
    Query(_params): Query<ListReviewsQuery>,
) -> Result<Json<AdminReviewListResponse>, ApiError> {
    // In a real implementation, we would retrieve all reviews with filtering
    let now = Utc::now().to_rfc3339();

    let reviews = vec![
        AdminReview {
            review_id: Uuid::new_v4(),
            submission_id: Uuid::new_v4(),
            user_email: "user@example.com".to_string(),
            reviewer_id: "reviewer123".to_string(),
            reviewer_email: "reviewer@example.com".to_string(),
            status: "in_progress".to_string(),
            decision: None,
            created_at: now.clone(),
        },
        AdminReview {
            review_id: Uuid::new_v4(),
            submission_id: Uuid::new_v4(),
            user_email: "anotheruser@example.com".to_string(),
            reviewer_id: "reviewer456".to_string(),
            reviewer_email: "anotherreviewer@example.com".to_string(),
            status: "completed".to_string(),
            decision: Some("approved".to_string()),
            created_at: now.clone(),
        }
    ];

    Ok(Json(AdminReviewListResponse { reviews }))
}

pub async fn assign_reviewer(
    State(_app_state): State<AppState>,
    Json(request): Json<AssignReviewerRequest>,
) -> Result<Json<ReviewAssignmentResponse>, ApiError> {
    // In a real implementation, we would assign a reviewer to a submission
    let now = Utc::now().to_rfc3339();

    let review_assignment = ReviewAssignmentResponse {
        review_id: Uuid::new_v4(),
        submission_id: request.submission_id,
        reviewer_id: request.reviewer_id,
        assigned_at: now,
    };

    Ok(Json(review_assignment))
}
