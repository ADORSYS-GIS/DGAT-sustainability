use crate::api::error::ApiError;
use crate::api::models::{SubmissionListResponse, SubmissionDetailResponse, AssessmentSubmission};
use crate::common::state::AppState;
use axum::{extract::{Path, State}, Json};
use uuid::Uuid;
use chrono::Utc;

pub async fn list_user_submissions(
    State(_app_state): State<AppState>,
) -> Result<Json<SubmissionListResponse>, ApiError> {
    // In a real implementation, we would retrieve user submissions from database
    let now = Utc::now().to_rfc3339();

    let submissions = vec![
        AssessmentSubmission {
            assessment_id: Uuid::new_v4(),
            user_id: "user123".to_string(),
            content: serde_json::json!({
                "assessment": {
                    "assessment_id": Uuid::new_v4(),
                    "language": "en"
                },
                "responses": [
                    {
                        "question_revision_id": Uuid::new_v4(),
                        "response": "Our organization has a comprehensive sustainability policy",
                        "files": []
                    }
                ]
            }),
            submitted_at: now.clone(),
            review_status: "pending_review".to_string(),
            reviewed_at: None,
        }
    ];

    Ok(Json(SubmissionListResponse { submissions }))
}

pub async fn get_submission(
    State(_app_state): State<AppState>,
    Path(submission_id): Path<Uuid>,
) -> Result<Json<SubmissionDetailResponse>, ApiError> {
    // In a real implementation, we would retrieve the specific submission from database
    let now = Utc::now().to_rfc3339();

    let submission = AssessmentSubmission {
        assessment_id: submission_id, // Using submission_id as assessment_id for this example
        user_id: "user123".to_string(),
        content: serde_json::json!({
            "assessment": {
                "assessment_id": Uuid::new_v4(),
                "language": "en"
            },
            "responses": [
                {
                    "question_revision_id": Uuid::new_v4(),
                    "response": "Our organization has a comprehensive sustainability policy",
                    "files": []
                }
            ]
        }),
        submitted_at: now,
        review_status: "pending_review".to_string(),
        reviewed_at: None,
    };

    Ok(Json(SubmissionDetailResponse { submission }))
}
