use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;
use serde::Serialize;

// Helper function to convert file::Model to FileMetadata
async fn convert_file_model_to_metadata(
    file_model: crate::common::database::entity::file::Model,
) -> FileMetadata {
    // Extract metadata fields from the JSON metadata
    let default_map = serde_json::Map::new();
    let metadata_obj = file_model.metadata.as_object().unwrap_or(&default_map);

    let filename = metadata_obj
        .get("filename")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let size = metadata_obj
        .get("size")
        .and_then(|v| v.as_i64())
        .unwrap_or(file_model.content.len() as i64);

    let content_type = metadata_obj
        .get("content_type")
        .and_then(|v| v.as_str())
        .unwrap_or("application/octet-stream")
        .to_string();

    let created_at = metadata_obj
        .get("created_at")
        .and_then(|v| v.as_str())
        .unwrap_or(&chrono::Utc::now().to_rfc3339())
        .to_string();

    FileMetadata {
        file_id: file_model.id,
        filename,
        size,
        content_type,
        created_at,
        metadata: Some(file_model.metadata),
    }
}

// Helper function to fetch files for a response
async fn fetch_files_for_response(
    app_state: &AppState,
    response_id: Uuid,
) -> Result<Vec<FileMetadata>, ApiError> {
    let file_models = app_state
        .database
        .assessments_response_file
        .get_files_for_response(response_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch files for response: {e}"))
        })?;

    let mut files = Vec::new();
    for file_model in file_models {
        files.push(convert_file_model_to_metadata(file_model).await);
    }

    Ok(files)
}

// Helper: check if user is member of org by org_id
fn is_member_of_org_by_id(claims: &Claims, org_id: &str) -> bool {
    claims.organizations.orgs.values().any(|info| info.id.as_deref() == Some(org_id))
}

#[derive(Debug, Deserialize)]
pub struct AssessmentQuery {
    status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrgAssessmentResults {
    pub org_id: String,
    pub num_assessments: usize,
    pub num_submissions: usize,
    pub category_counts: std::collections::HashMap<String, usize>,
}

// GET /api/assessments - List all org assessments for current user's org (org_admin and org_user)
pub async fn list_assessments(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AssessmentQuery>,
) -> Result<Json<AssessmentListResponse>, ApiError> {
    // Get org_id from claims (first org for now)
    let org_id = claims.organizations.orgs.values().next()
        .and_then(|info| info.id.clone())
        .ok_or(ApiError::BadRequest("No organization found in token".to_string()))?;

    // Fetch assessments from the database for the current org
    let assessment_models = app_state
        .database
        .assessments
        .get_assessments_by_org(&org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessments: {e}")))?;

    // Convert database models to API models
    let mut assessments = Vec::new();
    for model in assessment_models {
        // Determine status based on whether an assessment has been submitted
        let has_submission = app_state
            .database
            .assessments_submission
            .get_submission_by_assessment_id(model.assessment_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
            })?
            .is_some();

        let status = if has_submission {
            "submitted".to_string()
        } else {
            "draft".to_string()
        };

        assessments.push(Assessment {
            assessment_id: model.assessment_id,
            org_id: model.org_id.clone(),
            language: model.language,
            status,
            created_at: model.created_at.to_rfc3339(),
            updated_at: model.created_at.to_rfc3339(),
        });
    }

    // Filter by status if specified
    let filtered_assessments = if let Some(status) = &query.status {
        assessments
            .into_iter()
            .filter(|a| a.status == *status)
            .collect()
    } else {
        assessments
    };

    Ok(Json(AssessmentListResponse {
        assessments: filtered_assessments,
    }))
}

// POST /api/assessments - Only org_admin can create
pub async fn create_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<CreateAssessmentRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Get org_id from claims (first org for now)
    let org_id = claims.organizations.orgs.values().next()
        .and_then(|info| info.id.clone())
        .ok_or(ApiError::BadRequest("No organization found in token".to_string()))?;

    // Only org_admins can create
    if !claims.is_organization_admin() {
        return Err(ApiError::BadRequest("Only org_admin can create assessments".to_string()));
    }

    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Language must not be empty".to_string(),
        ));
    }

    // Create the assessment in the database
    let assessment_model = app_state
        .database
        .assessments
        .create_assessment(org_id.clone(), request.language)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create assessment: {e}")))?;

    // Convert a database model to an API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        org_id: assessment_model.org_id,
        language: assessment_model.language,
        status: "draft".to_string(),
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(AssessmentResponse { assessment })))
}

pub async fn get_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<Json<AssessmentWithResponsesResponse>, ApiError> {
    // Fetch the assessment from the database
    let assessment_model = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Check org membership
    if !is_member_of_org_by_id(&claims, &assessment_model.org_id) {
        return Err(ApiError::BadRequest(
            "You don't have permission to access this assessment".to_string(),
        ));
    }

    // Determine status based on whether assessment has been submitted
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    let status = if has_submission {
        "submitted".to_string()
    } else {
        "draft".to_string()
    };

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        org_id: assessment_model.org_id,
        language: assessment_model.language,
        status,
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    // Fetch the latest responses for this assessment
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch assessment responses: {e}"))
        })?;

    // Convert response models to API models
    let mut responses = Vec::new();
    for response_model in response_models {
        let files = fetch_files_for_response(&app_state, response_model.response_id).await?;

        // Parse response from JSON string to Vec<String>
        let response_array: Vec<String> = serde_json::from_str(&response_model.response)
            .unwrap_or_else(|_| vec![response_model.response.clone()]);

        responses.push(Response {
            response_id: response_model.response_id,
            assessment_id: response_model.assessment_id,
            question_revision_id: response_model.question_revision_id,
            response: response_array,
            version: response_model.version,
            updated_at: response_model.updated_at.to_rfc3339(),
            files,
        });
    }

    Ok(Json(AssessmentWithResponsesResponse {
        assessment,
        responses,
    }))
}

pub async fn update_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
    Json(request): Json<UpdateAssessmentRequest>,
) -> Result<Json<AssessmentResponse>, ApiError> {
    // Validate request
    if request.language.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "Language must not be empty".to_string(),
        ));
    }

    // First, fetch the assessment to verify org membership and admin
    let existing_assessment = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let existing_assessment = match existing_assessment {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Check org membership and admin
    if !is_member_of_org_by_id(&claims, &existing_assessment.org_id) || !claims.is_organization_admin() {
        return Err(ApiError::BadRequest(
            "You don't have permission to update this assessment".to_string(),
        ));
    }

    // Check if assessment has been submitted (cannot update submitted assessments)
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    if has_submission {
        return Err(ApiError::BadRequest(
            "Cannot update a submitted assessment".to_string(),
        ));
    }

    // Update the assessment in the database
    let assessment_model = app_state
        .database
        .assessments
        .update_assessment(assessment_id, Some(request.language))
        .await
        .map_err(|e| {
            if e.to_string().contains("Assessment not found") {
                ApiError::NotFound("Assessment not found".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to update assessment: {e}"))
            }
        })?;

    // Convert database model to API model
    let assessment = Assessment {
        assessment_id: assessment_model.assessment_id,
        org_id: assessment_model.org_id,
        language: assessment_model.language,
        status: "draft".to_string(),
        created_at: assessment_model.created_at.to_rfc3339(),
        updated_at: assessment_model.created_at.to_rfc3339(),
    };

    Ok(Json(AssessmentResponse { assessment }))
}

pub async fn delete_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    // Check if the assessment exists and get its details
    let assessment = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment = match assessment {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Check org membership and admin
    if !is_member_of_org_by_id(&claims, &assessment.org_id) || !claims.is_organization_admin() {
        return Err(ApiError::BadRequest(
            "You don't have permission to delete this assessment".to_string(),
        ));
    }

    // Check if assessment has been submitted (cannot delete submitted assessments)
    let has_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check submission status: {e}"))
        })?
        .is_some();

    if has_submission {
        return Err(ApiError::BadRequest(
            "Cannot delete a submitted assessment".to_string(),
        ));
    }

    // Delete the assessment from the database (this will cascade delete responses due to foreign key)
    app_state
        .database
        .assessments
        .delete_assessment(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete assessment: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn submit_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(assessment_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    let user_id = claims.sub.clone();

    // Verify that the assessment exists and user is a member of the org
    let assessment_model = app_state
        .database
        .assessments
        .get_assessment_by_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

    let assessment_model = match assessment_model {
        Some(a) => a,
        None => return Err(ApiError::NotFound("Assessment not found".to_string())),
    };

    // Check org membership and that user is not org_admin (only org_user can submit)
    if !is_member_of_org_by_id(&claims, &assessment_model.org_id) || claims.is_organization_admin() {
        return Err(ApiError::BadRequest(
            "You don't have permission to submit this assessment".to_string(),
        ));
    }

    // Get allowed categories for this user from claims
    let allowed_categories: Vec<String> = claims.organizations.orgs.values()
        .find(|info| info.id.as_deref() == Some(&assessment_model.org_id))
        .map(|info| info.categories.clone())
        .unwrap_or_default();

    // Fetch all responses for this assessment to include in the submission
    let response_models = app_state
        .database
        .assessments_response
        .get_latest_responses_by_assessment(assessment_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to fetch assessment responses: {e}"))
        })?;

    // Check that all responses are for allowed categories (org_user can only submit their assigned categories)
    for response_model in &response_models {
        // Fetch the question revision to get the category
        let question_revision = app_state
            .database
            .questions_revisions
            .get_revision_by_id(response_model.question_revision_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revision: {e}")))?;
        let question_revision = match question_revision {
            Some(qr) => qr,
            None => return Err(ApiError::BadRequest("Question revision not found".to_string())),
        };
        // Fetch the question to get the category
        let question = app_state
            .database
            .questions
            .get_question_by_id(question_revision.question_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {e}")))?;
        let question = match question {
            Some(q) => q,
            None => return Err(ApiError::BadRequest("Question not found".to_string())),
        };
        let category = question.category;
        if !allowed_categories.contains(&category) {
            return Err(ApiError::BadRequest(format!(
                "You are not allowed to answer questions in category: {}", category
            )));
        }
    }

    // Build the submission content with file metadata
    let mut responses_with_files = Vec::new();
    for response_model in &response_models {
        // Fetch files associated with this response
        let files = app_state
            .database
            .assessments_response_file
            .get_files_for_response(response_model.response_id)
            .await
            .map_err(|e| {
                ApiError::InternalServerError(format!("Failed to fetch files for response: {e}"))
            })?;

        // Convert file models to metadata
        let file_metadata: Vec<serde_json::Value> = files.iter().map(|file| {
            let empty_map = serde_json::Map::new();
            let metadata = file.metadata.as_object().unwrap_or(&empty_map);
            serde_json::json!({
                "file_id": file.id,
                "filename": metadata.get("filename").and_then(|v| v.as_str()).unwrap_or("unknown"),
                "size": metadata.get("size").and_then(|v| v.as_i64()).unwrap_or(file.content.len() as i64),
                "content_type": metadata.get("content_type").and_then(|v| v.as_str()).unwrap_or("application/octet-stream"),
                "created_at": metadata.get("created_at").and_then(|v| v.as_str()).unwrap_or(&chrono::Utc::now().to_rfc3339()),
                "metadata": file.metadata
            })
        }).collect();

        responses_with_files.push(serde_json::json!({
            "question_revision_id": response_model.question_revision_id,
            "response": response_model.response,
            "version": response_model.version,
            "files": file_metadata
        }));
    }

    let submission_content = serde_json::json!({
        "assessment": {
            "assessment_id": assessment_id,
            "language": assessment_model.language
        },
        "responses": responses_with_files
    });

    // Check if an org-level submission already exists for this assessment
    let existing_submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(assessment_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch org submission: {e}")))?;

    let (merged_content, had_existing_submission);
    if let Some(existing) = existing_submission {
        // Merge new user responses into existing org submission
        let mut content = existing.content.clone();
        let mut responses = content
            .get_mut("responses")
            .and_then(|r| r.as_array_mut())
            .cloned()
            .unwrap_or_else(Vec::new);
        // Remove any previous responses from this user for the same question_revision_id
        let new_responses = responses_with_files
            .iter()
            .map(|resp| {
                let mut resp_obj = resp.clone();
                if let Some(obj) = resp_obj.as_object_mut() {
                    obj.insert("user_id".to_string(), serde_json::json!(user_id));
                }
                resp_obj
            })
            .collect::<Vec<_>>();
        // Remove old responses from this user for the same question_revision_id
        let new_qrids: Vec<_> = new_responses.iter().filter_map(|r| r.get("question_revision_id")).cloned().collect();
        responses.retain(|r| {
            let qrid = r.get("question_revision_id");
            let uid = r.get("user_id");
            !(uid == Some(&serde_json::json!(user_id)) && qrid.map_or(false, |q| new_qrids.contains(q)))
        });
        // Add new responses
        responses.extend(new_responses);
        // Update content
        if let Some(obj) = content.as_object_mut() {
            obj.insert("responses".to_string(), serde_json::json!(responses));
        }
        merged_content = content;
        had_existing_submission = true;
    } else {
        // New org submission: add user_id to each response
        let mut content = submission_content.clone();
        if let Some(responses) = content.get_mut("responses").and_then(|r| r.as_array_mut()) {
            for resp in responses.iter_mut() {
                if let Some(obj) = resp.as_object_mut() {
                    obj.insert("user_id".to_string(), serde_json::json!(user_id));
                }
            }
        }
        merged_content = content;
        had_existing_submission = false;
    }

    // Create or update the org-level submission
    let _submission_model = if had_existing_submission {
        // Update existing
        app_state
            .database
            .assessments_submission
            .update_submission_content(assessment_id, merged_content.clone())
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to update org submission: {e}")))?
    } else {
        // Create new
        app_state
            .database
            .assessments_submission
            .create_submission(assessment_id, user_id.clone(), merged_content.clone())
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to create org submission: {e}")))?
    };

    // Build the response
    let now = chrono::Utc::now().to_rfc3339();
    let submission = AssessmentSubmission {
        assessment_id,
        user_id,
        content: merged_content,
        submitted_at: now,
        review_status: _submission_model.status.to_string(),
        reviewed_at: None,
    };

    Ok((
        StatusCode::CREATED,
        Json(AssessmentSubmissionResponse { submission }),
    ))
}

// GET /api/organizations/:org_id/assessments/results
pub async fn get_org_assessment_results(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(org_id): Path<String>,
) -> Result<Json<OrgAssessmentResults>, ApiError> {
    // Only org_admins for this org can access
    if !claims.is_organization_admin() || !is_member_of_org_by_id(&claims, &org_id) {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Get all assessments for this org
    let assessments = app_state
        .database
        .assessments
        .get_assessments_by_org(&org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessments: {e}")))?;
    let num_assessments = assessments.len();

    // Get all submissions for these assessments
    let mut num_submissions = 0;
    let mut category_counts = std::collections::HashMap::new();
    for assessment in &assessments {
        let submission = app_state
            .database
            .assessments_submission
            .get_submission_by_assessment_id(assessment.assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?;
        if let Some(sub) = submission {
            num_submissions += 1;
            // Parse content for category counts
            if let Some(responses) = sub.content.get("responses").and_then(|v| v.as_array()) {
                for resp in responses {
                    if let Some(qrid) = resp.get("question_revision_id").and_then(|v| v.as_str()) {
                        // Parse UUID
                        if let Ok(qrid) = uuid::Uuid::parse_str(qrid) {
                            // Get question revision
                            let question_revision = app_state
                                .database
                                .questions_revisions
                                .get_revision_by_id(qrid)
                                .await
                                .ok()
                                .flatten();
                            if let Some(qr) = question_revision {
                                // Get question
                                let question = app_state
                                    .database
                                    .questions
                                    .get_question_by_id(qr.question_id)
                                    .await
                                    .ok()
                                    .flatten();
                                if let Some(q) = question {
                                    *category_counts.entry(q.category).or_insert(0) += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(Json(OrgAssessmentResults {
        org_id,
        num_assessments,
        num_submissions,
        category_counts,
    }))
}

// NOTE: org_user can answer any assessment for their org, but only for their assigned categories. All permission checks are org-based.
