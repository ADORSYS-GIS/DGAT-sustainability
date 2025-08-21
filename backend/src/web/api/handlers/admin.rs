use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::{
    AdminAssessmentInfo, AdminResponseDetail, AdminSubmissionContent, AdminSubmissionDetail,
    AdminSubmissionListResponse,
};
use crate::common::models::claims::Claims;
use crate::common::models::keycloak::{KeycloakOrganization, UserInvitationRequest, UserInvitationResponse, UserInvitationStatus, EmailVerificationEvent};
use axum::{
    extract::{Path, Query, State, Extension},
    Json,
};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct ListSubmissionsQuery {
    status: Option<String>,
}

pub async fn list_all_submissions(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Query(params): Query<ListSubmissionsQuery>,
) -> Result<Json<AdminSubmissionListResponse>, ApiError> {
    // Fetch all submissions from the database
    let submission_models = app_state
        .database
        .assessments_submission
        .get_all_submissions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submissions: {e}")))?;

    // Get all organizations from Keycloak to map org_id to org_name
    let organizations = match app_state.keycloak_service.get_organizations(&token).await {
        Ok(orgs) => orgs,
        Err(e) => {
            tracing::error!("Failed to fetch organizations: {}", e);
            // Continue without organization names if Keycloak is unavailable
            Vec::new()
        }
    };

    // Create a map of org_id to org_name for quick lookup
    let org_map: std::collections::HashMap<String, String> = organizations
        .into_iter()
        .map(|org| (org.id, org.name))
        .collect();

    // Convert database models to API models
    let mut submissions = Vec::new();
    for model in submission_models {
        // Parse the content to extract assessment and responses information
        let default_map = serde_json::Map::new();
        let content_obj = model.content.as_object().unwrap_or(&default_map);

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

        // Get organization name from the map, fallback to org_id if not found
        let org_name = org_map.get(&model.org_id)
            .cloned()
            .unwrap_or_else(|| format!("Unknown Organization ({})", model.org_id));

        let submission = AdminSubmissionDetail {
            submission_id: model.submission_id,
            assessment_id: model.submission_id,
            org_id: model.org_id,
            org_name, // Include organization name
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

pub async fn list_temp_submissions_by_assessment(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
) -> Result<Json<AdminSubmissionListResponse>, ApiError> {
    // Check if user has admin permissions (similar to other admin endpoints)
    if !claims.can_create_assessments() {
        return Err(ApiError::BadRequest(
            "You don't have permission to view temp submissions. Only administrators can access this endpoint.".to_string(),
        ));
    }

    // Extract org_id from claims instead of path parameter
    let org_id = claims.get_org_id().ok_or_else(|| {
        ApiError::BadRequest("No organization found in user claims".to_string())
    })?;

    // Fetch temp submissions for the specific organization from the database
    let temp_submissions = app_state
        .database
        .temp_submission
        .get_temp_submissions_by_org_id(&org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch temp submissions: {e}")))?;

    // Get all organizations from Keycloak to map org_id to org_name
    let organizations = match app_state.keycloak_service.get_organizations(&token).await {
        Ok(orgs) => orgs,
        Err(e) => {
            tracing::error!("Failed to fetch organizations: {}", e);
            // Continue without organization names if Keycloak is unavailable
            Vec::new()
        }
    };

    // Create a map of org_id to org_name for quick lookup
    let org_map: std::collections::HashMap<String, String> = organizations
        .into_iter()
        .map(|org| (org.id, org.name))
        .collect();

    // Convert database models to API models
    let mut submissions = Vec::new();
    
    for model in temp_submissions {
        // Parse the content to extract assessment and responses information
        let default_map = serde_json::Map::new();
        let content_obj = model.content.as_object().unwrap_or(&default_map);

        // Extract assessment info
        let assessment_info = content_obj
            .get("assessment")
            .and_then(|a| a.as_object())
            .map(|a| AdminAssessmentInfo {
                assessment_id: a
                    .get("assessment_id")
                    .and_then(|id| id.as_str())
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .unwrap_or(model.temp_id),
                language: a
                    .get("language")
                    .and_then(|l| l.as_str())
                    .unwrap_or("en")
                    .to_string(),
            })
            .unwrap_or(AdminAssessmentInfo {
                assessment_id: model.temp_id,
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

                // Get question text and category from the database
                let (question_text, question_category) = match app_state
                    .database
                    .questions_revisions
                    .get_revision_by_id(question_revision_id)
                    .await
                {
                    Ok(Some(revision)) => {
                        let text = revision
                            .text
                            .get("en")
                            .and_then(|t| t.as_str())
                            .unwrap_or("Unknown question")
                            .to_string();

                        let category = match app_state
                            .database
                            .questions
                            .get_question_by_id(revision.question_id)
                            .await
                        {
                            Ok(Some(question)) => question.category,
                            _ => "Unknown category".to_string(),
                        };

                        (text, category)
                    }
                    _ => ("Unknown question".to_string(), "Unknown category".to_string()),
                };

                let response = response_obj
                    .get("response")
                    .and_then(|r| r.as_str())
                    .unwrap_or("")
                    .to_string();

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

        // Get organization name from the map, fallback to org_id if not found
        let org_name = org_map.get(&model.org_id)
            .cloned()
            .unwrap_or_else(|| format!("Unknown Organization ({})", model.org_id));

        let submission = AdminSubmissionDetail {
            submission_id: model.temp_id, // Use temp_id as submission_id for consistency
            assessment_id: model.temp_id, // temp_id is the assessment_id in temp_submission
            org_id: model.org_id,
            org_name, // Include organization name
            content: AdminSubmissionContent {
                assessment: assessment_info,
                responses,
            },
            review_status: model.status.to_string(),
            submitted_at: model.submitted_at.to_rfc3339(),
            reviewed_at: model.reviewed_at.map(|dt| dt.to_rfc3339()),
        };

        submissions.push(submission);
    }

    Ok(Json(AdminSubmissionListResponse { submissions }))
}

/// Create a new user invitation with email verification
pub async fn create_user_invitation(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Json(request): Json<UserInvitationRequest>,
) -> Result<Json<UserInvitationResponse>, ApiError> {
    // Check if user has admin permissions
    if !claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Generate username from email
    let username = request.email.split('@').next().unwrap_or(&request.email).to_string();
    
    // Create user request for Keycloak
    let create_user_request = crate::common::models::keycloak::CreateUserRequest {
        username: username.clone(),
        email: request.email.clone(),
        first_name: request.first_name.clone(),
        last_name: request.last_name.clone(),
        email_verified: Some(false),
        enabled: Some(true),
        attributes: Some(serde_json::json!({
            "organization_id": request.organization_id,
            "pending_roles": request.roles,
            "pending_categories": request.categories,
            "invitation_status": "pending_email_verification"
        })),
        credentials: None,
        required_actions: Some(vec!["VERIFY_EMAIL".to_string()]),
    };

    match app_state.keycloak_service.create_user_with_email_verification(&token, &create_user_request).await {
        Ok(user) => {
            let user_id = user.id.clone();
            let user_email = user.email.clone();
            
            // Send organization invitation immediately (regardless of email verification)
            match app_state.keycloak_service.send_organization_invitation_immediate(&token, &request.organization_id, &user_id, request.roles.clone()).await {
                Ok(invitation) => {
                    tracing::info!(user_id = %user_id, org_id = %request.organization_id, "Organization invitation sent immediately");
                    
                    let response = UserInvitationResponse {
                        user_id: user.id,
                        email: user.email,
                        status: UserInvitationStatus::Active,
                        message: "User created successfully. Email verification and organization invitation emails have been sent. User roles have been assigned.".to_string(),
                    };
                    
                    tracing::info!(user_id = %user_id, email = %user_email, "User invitation created successfully with immediate organization invitation");
                    Ok(Json(response))
                },
                Err(e) => {
                    tracing::warn!(user_id = %user_id, error = %e, "Failed to send organization invitation immediately, but user was created");
                    
                    let response = UserInvitationResponse {
                        user_id: user.id,
                        email: user.email,
                        status: UserInvitationStatus::PendingEmailVerification,
                        message: "User created successfully. Email verification email has been sent. Organization invitation will be sent after email verification.".to_string(),
                    };
                    
                    tracing::info!(user_id = %user_id, email = %user_email, "User invitation created successfully (organization invitation failed)");
                    Ok(Json(response))
                }
            }
        },
        Err(e) => {
            tracing::error!("Failed to create user invitation: {}", e);
            Err(ApiError::InternalServerError(format!("Failed to create user invitation: {}", e)))
        }
    }
}

/// Manual trigger for email verification (for testing)
pub async fn trigger_user_verification_manual(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Path(user_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Check if user has admin permissions
    if !_claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Trigger email verification
    match app_state.keycloak_service.trigger_email_verification(&token, &user_id).await {
        Ok(()) => {
            tracing::info!(user_id = %user_id, "Email verification triggered manually");
            Ok(Json(json!({
                "status": "success",
                "message": "Email verification triggered successfully",
                "user_id": user_id
            })))
        },
        Err(e) => {
            tracing::error!(user_id = %user_id, error = %e, "Failed to trigger email verification");
            Err(ApiError::InternalServerError(format!("Failed to trigger email verification: {}", e)))
        }
    }
}

/// Check and trigger organization invitation (polling approach)
pub async fn check_and_trigger_organization_invitation(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Path(user_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Check if user has admin permissions
    if !_claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Check if user's email is verified
    let is_verified = app_state.keycloak_service.is_user_email_verified(&token, &user_id).await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to check email verification: {}", e)))?;

    if !is_verified {
        return Ok(Json(json!({
            "status": "pending",
            "message": "Email not yet verified",
            "user_id": user_id
        })));
    }

    // Process the email verification
    match process_email_verification(&app_state, &token, &user_id).await {
        Ok(()) => {
            tracing::info!(user_id = %user_id, "Organization invitation triggered via polling");
            Ok(Json(json!({
                "status": "success",
                "message": "Email verified and organization invitation sent",
                "user_id": user_id
            })))
        },
        Err(e) => {
            tracing::error!(user_id = %user_id, error = %e, "Failed to process email verification via polling");
            Err(ApiError::InternalServerError(format!("Failed to process email verification: {}", e)))
        }
    }
}

/// Process email verification and trigger organization invitation
async fn process_email_verification(
    app_state: &AppState,
    token: &str,
    user_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Get user attributes to extract organization and role information
    let user = app_state.keycloak_service.get_user_by_id(token, user_id).await?;

    let attributes = user.attributes.ok_or_else(|| {
        anyhow::anyhow!("User attributes not found")
    })?;

    let org_id = attributes.get("organization_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Organization ID not found in user attributes"))?;

    let pending_roles: Vec<String> = attributes.get("pending_roles")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let pending_categories: Vec<String> = attributes.get("pending_categories")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    // Handle the email verification event
    app_state.keycloak_service.handle_email_verification_event(
        token, 
        user_id, 
        org_id, 
        pending_roles.clone(), 
        pending_categories.clone()
    ).await?;

    // Update user attributes to mark as email verified
    let updated_attributes = json!({
        "organization_id": org_id,
        "pending_roles": pending_roles,
        "pending_categories": pending_categories,
        "invitation_status": "email_verified",
        "email_verified_at": chrono::Utc::now().to_rfc3339()
    });

    let update_request = crate::common::models::keycloak::CreateUserRequest {
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: Some(true),
        enabled: Some(true),
        attributes: Some(updated_attributes),
        credentials: None,
        required_actions: Some(vec![]),
    };

    app_state.keycloak_service.update_user_attributes(token, user_id, &update_request).await?;

    tracing::info!(user_id = %user_id, "Email verification processed successfully");
    Ok(())
}

/// Manual trigger for organization invitation (for testing)
pub async fn trigger_organization_invitation_manual(
    State(app_state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Path(user_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Check if user has admin permissions
    if !_claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    // Get user attributes to extract organization and role information
    let user = app_state.keycloak_service.get_user_by_id(&token, &user_id).await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get user: {}", e)))?;

    let attributes = user.attributes.ok_or_else(|| {
        ApiError::InternalServerError("User attributes not found".to_string())
    })?;

    let org_id = attributes.get("organization_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::InternalServerError("Organization ID not found in user attributes".to_string()))?;

    let pending_roles: Vec<String> = attributes.get("pending_roles")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let pending_categories: Vec<String> = attributes.get("pending_categories")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    // Handle the email verification event manually
    match app_state.keycloak_service.handle_email_verification_event(
        &token, 
        &user_id, 
        org_id, 
        pending_roles.clone(), 
        pending_categories.clone()
    ).await {
        Ok(()) => {
            // Update user attributes to mark as email verified
            let updated_attributes = json!({
                "organization_id": org_id,
                "pending_roles": pending_roles,
                "pending_categories": pending_categories,
                "invitation_status": "email_verified",
                "email_verified_at": chrono::Utc::now().to_rfc3339()
            });

            let update_request = crate::common::models::keycloak::CreateUserRequest {
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: Some(true),
                enabled: Some(true),
                attributes: Some(updated_attributes),
                credentials: None,
                required_actions: Some(vec![]),
            };

            app_state.keycloak_service.update_user_attributes(&token, &user_id, &update_request).await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to update user attributes: {}", e)))?;

            tracing::info!(user_id = %user_id, "Organization invitation triggered manually");
            Ok(Json(json!({
                "status": "success",
                "message": "Organization invitation triggered successfully",
                "user_id": user_id
            })))
        },
        Err(e) => {
            tracing::error!(user_id = %user_id, error = %e, "Failed to trigger organization invitation");
            Err(ApiError::InternalServerError(format!("Failed to trigger organization invitation: {}", e)))
        }
    }
}

/// Handle email verification webhook/event
pub async fn handle_email_verification_webhook(
    State(app_state): State<AppState>,
    Extension(token): Extension<String>,
    Json(event): Json<EmailVerificationEvent>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Get user attributes to extract organization and role information
    let user = app_state.keycloak_service.get_user_by_id(&token, &event.user_id).await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get user: {}", e)))?;

    let attributes = user.attributes.ok_or_else(|| {
        ApiError::InternalServerError("User attributes not found".to_string())
    })?;

    let org_id = attributes.get("organization_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::InternalServerError("Organization ID not found in user attributes".to_string()))?;

    let pending_roles: Vec<String> = attributes.get("pending_roles")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let pending_categories: Vec<String> = attributes.get("pending_categories")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    // Handle the email verification event
    match app_state.keycloak_service.handle_email_verification_event(
        &token, 
        &event.user_id, 
        org_id, 
        pending_roles.clone(), 
        pending_categories.clone()
    ).await {
        Ok(()) => {
            // Update user attributes to mark as email verified
            let updated_attributes = serde_json::json!({
                "organization_id": org_id,
                "pending_roles": pending_roles,
                "pending_categories": pending_categories,
                "invitation_status": "email_verified",
                "email_verified_at": event.verified_at
            });

            let update_request = crate::common::models::keycloak::CreateUserRequest {
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: Some(true),
                enabled: Some(true),
                attributes: Some(updated_attributes),
                credentials: None,
                required_actions: None,
            };

            // Update user attributes
            app_state.keycloak_service.update_user_attributes(&token, &event.user_id, &update_request).await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to update user attributes: {}", e)))?;

            tracing::info!(user_id = %event.user_id, email = %event.email, "Email verification handled successfully");
            
            Ok(Json(serde_json::json!({
                "status": "success",
                "message": "Email verification handled successfully, organization invitation sent",
                "user_id": event.user_id,
                "email": event.email
            })))
        },
        Err(e) => {
            tracing::error!("Failed to handle email verification event: {}", e);
            Err(ApiError::InternalServerError(format!("Failed to handle email verification event: {}", e)))
        }
    }
}

/// Get user invitation status
pub async fn get_user_invitation_status(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(token): Extension<String>,
    Path(user_id): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Check if user has admin permissions
    if !claims.is_application_admin() {
        return Err(ApiError::BadRequest("Insufficient permissions".to_string()));
    }

    let user = app_state.keycloak_service.get_user_by_id(&token, &user_id).await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to get user: {}", e)))?;

    let attributes = user.attributes.unwrap_or_default();
    let invitation_status = attributes.get("invitation_status")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let response = serde_json::json!({
        "user_id": user.id,
        "email": user.email,
        "email_verified": user.email_verified,
        "invitation_status": invitation_status,
        "organization_id": attributes.get("organization_id"),
        "pending_roles": attributes.get("pending_roles"),
        "pending_categories": attributes.get("pending_categories"),
        "email_verified_at": attributes.get("email_verified_at"),
        "org_invited_at": attributes.get("org_invited_at")
    });

    Ok(Json(response))
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
