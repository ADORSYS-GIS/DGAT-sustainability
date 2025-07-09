use crate::api::error::ApiError;
use crate::api::models::{
    AdminSubmissionListResponse, AdminSubmissionDetail, AdminSubmissionContent, 
    AdminAssessmentInfo, AdminResponseDetail, AdminReviewListResponse, AdminReview, 
    AssignReviewerRequest, ReviewAssignmentResponse
};
use crate::common::state::AppState;
use axum::{extract::{Path, Query, State}, Json};
use serde::Deserialize;
use uuid::Uuid;
use chrono::Utc;

#[derive(Deserialize)]
pub struct ListSubmissionsQuery {
    status: Option<String>,
    reviewer_id: Option<String>,
}

pub async fn list_all_submissions(
    State(_app_state): State<AppState>,
    Query(_params): Query<ListSubmissionsQuery>,
) -> Result<Json<AdminSubmissionListResponse>, ApiError> {
    // In a real implementation, we would retrieve all submissions with filtering
    let now = Utc::now().to_rfc3339();

    let submissions = vec![
        AdminSubmissionDetail {
            submission_id: Uuid::new_v4(),
            assessment_id: Uuid::new_v4(),
            user_id: "user123".to_string(),
            content: AdminSubmissionContent {
                assessment: AdminAssessmentInfo {
                    assessment_id: Uuid::new_v4(),
                    language: "en".to_string(),
                },
                responses: vec![
                    AdminResponseDetail {
                        question_text: "What is your organization's sustainability policy?".to_string(),
                        question_category: "Environmental".to_string(),
                        response: "Our organization has a comprehensive sustainability policy".to_string(),
                        files: vec![],
                    },
                    AdminResponseDetail {
                        question_text: "How do you manage waste reduction?".to_string(),
                        question_category: "Environmental".to_string(),
                        response: "We implement recycling programs and minimize packaging".to_string(),
                        files: vec![],
                    }
                ],
            },
            review_status: "pending_review".to_string(),
            submitted_at: now.clone(),
            reviewed_at: None,
        },
        AdminSubmissionDetail {
            submission_id: Uuid::new_v4(),
            assessment_id: Uuid::new_v4(),
            user_id: "user456".to_string(),
            content: AdminSubmissionContent {
                assessment: AdminAssessmentInfo {
                    assessment_id: Uuid::new_v4(),
                    language: "en".to_string(),
                },
                responses: vec![
                    AdminResponseDetail {
                        question_text: "What is your organization's sustainability policy?".to_string(),
                        question_category: "Environmental".to_string(),
                        response: "We have integrated sustainability into our core business strategy".to_string(),
                        files: vec![],
                    }
                ],
            },
            review_status: "under_review".to_string(),
            submitted_at: now.clone(),
            reviewed_at: None,
        }
    ];

    Ok(Json(AdminSubmissionListResponse { submissions }))
}

#[derive(Deserialize)]
pub struct ListReviewsQuery {
    status: Option<String>,
    reviewer_id: Option<String>,
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
