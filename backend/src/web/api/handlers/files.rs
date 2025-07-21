use axum::{
    body::Bytes,
    extract::{Extension, Multipart, Path, State},
    http::{header, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

// Helper: check if user is member of org by org_id
fn is_member_of_org_by_id(claims: &crate::common::models::claims::Claims, org_id: &str) -> bool {
    claims.organizations.orgs.values().any(|info| info.id.as_deref() == Some(org_id))
}

pub async fn upload_file(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, ApiError> {
    // Extract file data from multipart form
    let mut file_data: Option<Bytes> = None;
    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;
    let mut additional_metadata: Option<serde_json::Value> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| ApiError::BadRequest(format!("Failed to process multipart form: {e}")))?
    {
        let name = field.name().unwrap_or("").to_string();

        if name == "file" {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());
            file_data = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| ApiError::BadRequest(format!("Failed to read file data: {e}")))?,
            );
        } else if name == "metadata" {
            let data = field
                .bytes()
                .await
                .map_err(|e| ApiError::BadRequest(format!("Failed to read metadata: {e}")))?;
            let text = String::from_utf8_lossy(&data);
            additional_metadata = Some(
                serde_json::from_str(&text)
                    .map_err(|e| ApiError::BadRequest(format!("Invalid metadata JSON: {e}")))?,
            );
        }
    }

    // Validate that we received a file
    let file_data =
        file_data.ok_or_else(|| ApiError::BadRequest("No file provided".to_string()))?;
    let filename =
        filename.ok_or_else(|| ApiError::BadRequest("No filename provided".to_string()))?;
    let content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());

    // Validate file size (e.g., max 1MB)
    const MAX_FILE_SIZE: usize = 1024 * 1024; // 1MB
    if file_data.len() > MAX_FILE_SIZE {
        return Err(ApiError::BadRequest(
            "File size exceeds maximum allowed size (1MB)".to_string(),
        ));
    }

    // Create metadata JSON with file information
    let now = chrono::Utc::now().to_rfc3339();
    let size = file_data.len() as i64;

    let mut metadata = serde_json::json!({
        "filename": filename,
        "content_type": content_type,
        "size": size,
        "created_at": now,
        "uploaded_by": claims.sub
    });

    // Merge additional metadata if provided
    if let Some(additional) = additional_metadata {
        if let (Some(metadata_obj), Some(additional_obj)) =
            (metadata.as_object_mut(), additional.as_object())
        {
            for (key, value) in additional_obj {
                metadata_obj.insert(key.clone(), value.clone());
            }
        }
    }

    // Store the file in the database
    app_state
        .database
        .file
        .create_file(file_data.to_vec(), metadata.clone())
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to store file: {e}")))?;

    Ok(StatusCode::CREATED)
}

pub async fn download_file(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(file_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    let _user_id = &claims.sub; // For future use in access control

    // Fetch the file from the database
    let file_model = app_state
        .database
        .file
        .get_file_by_id(file_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch file: {e}")))?;

    let file_model = match file_model {
        Some(f) => f,
        None => return Err(ApiError::NotFound("File not found".to_string())),
    };

    // Extract metadata from the file
    let default_map = serde_json::Map::new();
    let metadata_obj = file_model.metadata.as_object().unwrap_or(&default_map);

    let filename = metadata_obj
        .get("filename")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let content_type = metadata_obj
        .get("content_type")
        .and_then(|v| v.as_str())
        .unwrap_or("application/octet-stream");

    // Create a response with the file content and appropriate headers
    let content_disposition =
        HeaderValue::from_str(&format!("attachment; filename=\"{filename}\""))
            .map_err(|e| ApiError::InternalServerError(format!("Invalid header value: {e}")))?;
    let content_type_header = HeaderValue::from_str(content_type)
        .map_err(|e| ApiError::InternalServerError(format!("Invalid content type: {e}")))?;

    let headers = [
        (header::CONTENT_TYPE, content_type_header),
        (header::CONTENT_DISPOSITION, content_disposition),
    ];

    Ok((headers, file_model.content))
}

pub async fn delete_file(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(file_id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let user_id = &claims.sub;

    // Fetch the file to verify ownership
    let file_model = app_state
        .database
        .file
        .get_file_by_id(file_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch file: {e}")))?;

    let file_model = match file_model {
        Some(f) => f,
        None => return Err(ApiError::NotFound("File not found".to_string())),
    };

    // Check if the current user uploaded the file
    let default_map = serde_json::Map::new();
    let metadata_obj = file_model.metadata.as_object().unwrap_or(&default_map);

    let uploaded_by = metadata_obj
        .get("uploaded_by")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if uploaded_by != *user_id {
        return Err(ApiError::BadRequest(
            "You don't have permission to delete this file".to_string(),
        ));
    }

    // Check if the file is still referenced by any responses
    let responses = app_state
        .database
        .assessments_response_file
        .get_responses_for_file(file_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to check file references: {e}"))
        })?;

    if !responses.is_empty() {
        return Err(ApiError::BadRequest(
            "Cannot delete file that is still attached to responses".to_string(),
        ));
    }

    // Delete the file from the database
    app_state
        .database
        .file
        .delete_file(file_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete file: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_file_metadata(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(file_id): Path<Uuid>,
) -> Result<Json<FileMetadataResponse>, ApiError> {
    let _user_id = &claims.sub; // For future use in access control

    // Fetch the file from the database
    let file_model = app_state
        .database
        .file
        .get_file_by_id(file_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch file: {e}")))?;

    let file_model = match file_model {
        Some(f) => f,
        None => return Err(ApiError::NotFound("File not found".to_string())),
    };

    // Extract metadata from the file
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

    let metadata = FileMetadata {
        file_id: file_model.id,
        filename,
        size,
        content_type,
        created_at,
        metadata: Some(file_model.metadata),
    };

    Ok(Json(FileMetadataResponse { metadata }))
}

pub async fn attach_file(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((assessment_id, response_id)): Path<(Uuid, Uuid)>,
    Json(request): Json<AttachFileRequest>,
) -> Result<StatusCode, ApiError> {
    let user_id = &claims.sub;

    // Verify that the current user is the owner of the assessment
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

    if !is_member_of_org_by_id(&claims, &assessment_model.org_id) {
        return Err(ApiError::BadRequest(
            "You don't have permission to access this assessment".to_string(),
        ));
    }

    // Verify that the assessment is in draft status (not submitted)
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
            "Cannot attach files to a submitted assessment".to_string(),
        ));
    }

    // Verify that the response exists and belongs to the assessment
    let response_model = app_state
        .database
        .assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {e}")))?;

    let response_model = match response_model {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    if response_model.assessment_id != assessment_id {
        return Err(ApiError::BadRequest(
            "Response does not belong to the specified assessment".to_string(),
        ));
    }

    // Verify that the file exists
    let file_model = app_state
        .database
        .file
        .get_file_by_id(request.file_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch file: {e}")))?;

    if file_model.is_none() {
        return Err(ApiError::NotFound("File not found".to_string()));
    }

    // Create the association between the response and the file
    app_state
        .database
        .assessments_response_file
        .link_file_to_response(response_id, request.file_id)
        .await
        .map_err(|e| {
            if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
                ApiError::BadRequest("File is already attached to this response".to_string())
            } else {
                ApiError::InternalServerError(format!("Failed to attach file to response: {e}"))
            }
        })?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_file(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((assessment_id, response_id, file_id)): Path<(Uuid, Uuid, Uuid)>,
) -> Result<StatusCode, ApiError> {
    let user_id = &claims.sub;

    // Verify that the current user is the owner of the assessment
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

    if !is_member_of_org_by_id(&claims, &assessment_model.org_id) {
        return Err(ApiError::BadRequest(
            "You don't have permission to access this assessment".to_string(),
        ));
    }

    // Verify that the assessment is in draft status (not submitted)
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
            "Cannot remove files from a submitted assessment".to_string(),
        ));
    }

    // Verify that the response exists and belongs to the assessment
    let response_model = app_state
        .database
        .assessments_response
        .get_response_by_id(response_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch response: {e}")))?;

    let response_model = match response_model {
        Some(r) => r,
        None => return Err(ApiError::NotFound("Response not found".to_string())),
    };

    if response_model.assessment_id != assessment_id {
        return Err(ApiError::BadRequest(
            "Response does not belong to the specified assessment".to_string(),
        ));
    }

    // Remove the association between the response and the file
    let result = app_state
        .database
        .assessments_response_file
        .unlink_file_from_response(response_id, file_id)
        .await
        .map_err(|e| {
            ApiError::InternalServerError(format!("Failed to remove file from response: {e}"))
        })?;

    if result.rows_affected == 0 {
        return Err(ApiError::NotFound(
            "File is not attached to this response".to_string(),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
