//! Centralized access-control helpers for per-user assessment/category scoping.
//!
//! Rules:
//! - `Org_User`: may only see/answer assessments explicitly assigned to them
//!   (`assessment_user_assignments`), and only the categories assigned to them
//!   (`user_category_assignments`). Strict: an empty category assignment means
//!   they can answer nothing.
//! - `org_admin` / `application_admin`: may access all assessments in their org,
//!   and may answer any category that has NOT been delegated to an Org_User.

use crate::common::models::claims::Claims;
use crate::web::api::error::ApiError;
use crate::web::routes::AppState;
use uuid::Uuid;

/// Assessment IDs assigned to a user within an org.
pub async fn get_user_assigned_assessment_ids(
    app_state: &AppState,
    org_id: &str,
    user_id: &str,
) -> Result<Vec<Uuid>, ApiError> {
    app_state
        .database
        .assessment_user_assignments
        .get_assigned_assessment_ids_for_user(org_id, user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment assignments: {e}")))
}

/// Category IDs assigned to a user within an org.
pub async fn get_user_assigned_category_ids(
    app_state: &AppState,
    org_id: &str,
    user_id: &str,
) -> Result<Vec<Uuid>, ApiError> {
    let rows = app_state
        .database
        .user_category_assignments
        .get_all_assignments_for_org(org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category assignments: {e}")))?;

    Ok(rows
        .into_iter()
        .filter(|r| r.keycloak_user_id == user_id)
        .map(|r| r.category_catalog_id)
        .collect())
}

/// Whether a user is explicitly assigned to an assessment.
pub async fn is_assessment_assigned_to_user(
    app_state: &AppState,
    assessment_id: Uuid,
    user_id: &str,
) -> Result<bool, ApiError> {
    app_state
        .database
        .assessment_user_assignments
        .is_user_assigned(assessment_id, user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to check assessment assignment: {e}")))
}

/// Whether the caller may access (see/read) the given assessment.
/// - Org_User: must be explicitly assigned.
/// - org_admin / application_admin: must belong to the assessment's org.
pub async fn can_access_assessment(
    app_state: &AppState,
    claims: &Claims,
    assessment_org_id: &str,
    assessment_id: Uuid,
) -> Result<bool, ApiError> {
    if claims.is_application_admin() {
        return Ok(true);
    }

    let org_id = claims
        .get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    if claims.is_organization_admin() {
        return Ok(assessment_org_id == org_id);
    }

    // Org_User
    is_assessment_assigned_to_user(app_state, assessment_id, &claims.sub).await
}

/// Whether the caller may answer a question belonging to `category_id`.
/// - Org_User: category must be in their assigned categories (strict).
/// - org_admin: category must NOT be delegated to any Org_User.
/// - application_admin: always allowed.
pub async fn can_answer_category(
    app_state: &AppState,
    claims: &Claims,
    org_id: &str,
    category_id: Uuid,
) -> Result<bool, ApiError> {
    if claims.is_application_admin() {
        return Ok(true);
    }

    if claims.is_organization_admin() {
        let assigned_ids = app_state
            .database
            .user_category_assignments
            .get_assigned_category_ids_for_org(org_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch category assignments: {e}")))?;
        return Ok(!assigned_ids.contains(&category_id));
    }

    // Org_User: strict — must have the category assigned.
    let assigned = get_user_assigned_category_ids(app_state, org_id, &claims.sub).await?;
    Ok(assigned.contains(&category_id))
}

/// Resolve the category_catalog_id for a question revision.
pub async fn get_category_id_for_revision(
    app_state: &AppState,
    question_revision_id: Uuid,
) -> Result<Option<Uuid>, ApiError> {
    let revision = app_state
        .database
        .questions_revisions
        .get_revision_by_id(question_revision_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question revision: {e}")))?;

    let revision = match revision {
        Some(r) => r,
        None => return Ok(None),
    };

    let question = app_state
        .database
        .questions
        .get_question_by_id(revision.question_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch question: {e}")))?;

    Ok(question.map(|q| q.category_id))
}
