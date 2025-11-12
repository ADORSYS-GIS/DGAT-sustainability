use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::{Value, json};
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;


/// Helper function to process report data and generate report content
async fn generate_report_content(
    requests: &Vec<GenerateReportRequest>,
    submission_id: Uuid,
    app_state: &AppState
) -> Result<Value, ApiError> {
    let submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found".to_string()))?;

    let empty_responses = vec![];
    let responses = submission.content
        .get("responses")
        .and_then(|r| r.as_array())
        .unwrap_or(&empty_responses);

    let mut recommendations: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
    for request in requests {
        if !request.category.is_empty() {
            // Create a stable, unique ID based on the category and recommendation text.
            let recommendation_id = Uuid::new_v5(&Uuid::NAMESPACE_DNS, format!("{}-{}", request.category, request.recommendation).as_bytes());
            recommendations.entry(request.category.clone())
                .or_default()
                .push(json!({
                    "id": recommendation_id.to_string(),
                    "text": request.recommendation,
                    "status": request.status.clone().unwrap_or_else(|| "todo".to_string()),
                }));
        }
    }

    let mut categories: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
    for response in responses {
        if let (Some(question_revision_id_str), Some(response_str)) = (
            response.get("question_revision_id").and_then(|q| q.as_str()),
            response.get("response").and_then(|r| r.as_str())
        ) {
            if let Ok(question_revision_id) = Uuid::parse_str(question_revision_id_str) {
                if let Ok(Some(revision)) = app_state.database.questions_revisions.get_revision_by_id(question_revision_id).await {
                    if let Ok(Some(question)) = app_state.database.questions.get_question_by_id(revision.question_id).await {
                        if let Ok(Some(category_model)) = app_state.database.category_catalog.get_category_catalog_by_id(question.category_id).await {
                            let question_text = revision.text.get("en").and_then(|t| t.as_str()).unwrap_or("Unknown question");
                            let answer = serde_json::from_str(response_str).unwrap_or(json!({ "text": response_str }));
                            
                            categories.entry(category_model.name)
                                .or_default()
                                .push(json!({ "question": question_text, "answer": answer }));
                        }
                    }
                }
            }
        }
    }

    let mut result_object = serde_json::Map::new();
    for (category, questions) in categories {
        let category_recommendations = recommendations.remove(&category).unwrap_or_else(|| {
            let default_id = Uuid::new_v5(&Uuid::NAMESPACE_DNS, format!("{}-{}", category, "No recommendation provided").as_bytes());
            vec![json!({"id": default_id.to_string(), "text": "No recommendation provided", "status": "todo"})]
        });

        result_object.insert(category, json!({
            "questions": questions,
            "recommendations": category_recommendations,
        }));
    }

    Ok(json!([result_object]))
}



/// List all reports for the authenticated organization
/// GET /user/reports
/// List all reports for the authenticated organization
#[utoipa::path(
    get,
    path = "/user/reports",
    tag = "Report",
    responses((status = 200, description = "Reports", body = ReportListResponse))
)]
pub async fn list_user_reports(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<impl IntoResponse, ApiError> {
    let org_id = claims.get_org_id()
        .ok_or_else(|| ApiError::BadRequest("No organization ID found in token".to_string()))?;

    // Get all submissions for the organization
    let org_submissions = app_state
        .database
        .assessments_submission
        .get_submissions_by_org(&org_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch organization submissions: {e}")))?;

    // Collect all reports for organization's submissions
    let mut all_reports = Vec::new();

    for submission in org_submissions {
        let submission_id = submission.submission_id;

        // Get reports for this submission
        let report_models = app_state
            .database
            .submission_reports
            .get_reports_by_submission(submission_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch reports for submission {}: {e}", submission_id)))?;

        // Convert database models to API models and add to collection
        for model in report_models {
            let assessment_name = submission.content
               .get("assessment_name")
               .and_then(|n| n.as_str())
               .unwrap_or("Unknown Assessment")
               .to_string();

           all_reports.push(Report {
               report_id: model.report_id,
               submission_id: model.submission_id,
               assessment_id: submission.submission_id,
               assessment_name,
               status: model.status,
               generated_at: model.generated_at.to_rfc3339(),
               data: model.data,
           });
        }
    }

    Ok(Json(ReportListResponse { reports: all_reports }))
}

/// List reports for a submission
/// GET /submissions/{submission_id}/reports
/// List reports for a submission
#[utoipa::path(
    get,
    path = "/submissions/{submission_id}/reports",
    tag = "Report",
    params(("submission_id" = uuid::Uuid, Path, description = "Submission ID")),
    responses((status = 200, description = "Reports for submission", body = ReportListResponse), (status = 404, description = "Submission not found"))
)]
pub async fn list_reports(
    State(app_state): State<AppState>,
    Path(submission_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if submission exists
    let submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found".to_string()))?;

    // Get reports for the submission
    let report_models = app_state
        .database
        .submission_reports
        .get_reports_by_submission(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch reports: {e}")))?;
    
    let assessment_name = submission.content
        .get("assessment_name")
        .and_then(|n| n.as_str())
        .unwrap_or("Unknown Assessment")
        .to_string();

    // Convert database models to API models
    let reports: Vec<Report> = report_models
        .into_iter()
        .map(|model| Report {
            report_id: model.report_id,
            submission_id: model.submission_id,
            assessment_id: submission.submission_id,
            assessment_name: assessment_name.clone(),
            status: model.status,
            generated_at: model.generated_at.to_rfc3339(),
            data: model.data,
        })
        .collect();

    Ok(Json(ReportListResponse { reports }))
}

/// Generate a new report for a submission
/// POST /submissions/{submission_id}/reports
/// Generate a new report for a submission
#[utoipa::path(
    post,
    path = "/submissions/{submission_id}/reports",
    tag = "Report",
    params(("submission_id" = uuid::Uuid, Path, description = "Submission ID")),
    request_body = Vec<GenerateReportRequest>,
    responses((status = 201, description = "Report generation started", body = ReportGenerationResponse), (status = 404, description = "Submission not found"))
)]
pub async fn generate_report(
    State(app_state): State<AppState>,
    Path(submission_id): Path<Uuid>,
    Json(request): Json<Vec<GenerateReportRequest>>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if submission exists
    let _submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found".to_string()))?;

    // Generate the actual report content using the provided data
    let report_content = generate_report_content(&request, submission_id, &app_state).await?;

    // Create the report with initial "generating" status
    let mut report_model = app_state
        .database
        .submission_reports
        .create_report(submission_id, None)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to create report: {e}")))?;

    // Update the report with the generated content and "completed" status
    report_model = app_state
        .database
        .submission_reports
        .update_report_status(report_model.report_id, "completed".to_string(), Some(report_content))
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to update report with content: {e}")))?;

    // Update the assessment submission status to "reviewed" after successful report generation
    app_state
        .database
        .assessments_submission
        .update_submission_status(submission_id, crate::common::database::entity::assessments_submission::SubmissionStatus::Reviewed)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to update submission status: {e}")))?;

    let response = ReportGenerationResponse {
        report_id: report_model.report_id,
        status: report_model.status,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Get a specific report
/// GET /reports/{report_id}
/// Get a specific report
#[utoipa::path(
    get,
    path = "/reports/{report_id}",
    tag = "Report",
    params(("report_id" = uuid::Uuid, Path, description = "Report ID")),
    responses((status = 200, description = "Report detail", body = ReportResponse), (status = 404, description = "Not found"))
)]
pub async fn get_report(
    State(app_state): State<AppState>,
    Path(report_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    let report_model = app_state
        .database
        .submission_reports
        .get_report_by_id(report_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch report: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Report not found".to_string()))?;

    let submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(report_model.submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found for this report".to_string()))?;

    let assessment_name = submission.content
        .get("assessment_name")
        .and_then(|n| n.as_str())
        .unwrap_or("Unknown Assessment")
        .to_string();

    let report = Report {
        report_id: report_model.report_id,
        submission_id: report_model.submission_id,
        assessment_id: submission.submission_id,
        assessment_name,
        status: report_model.status,
        generated_at: report_model.generated_at.to_rfc3339(),
        data: report_model.data,
    };

    Ok(Json(ReportResponse { report }))
}

/// Delete a report
/// DELETE /reports/{report_id}
/// Delete a report
#[utoipa::path(
    delete,
    path = "/reports/{report_id}",
    tag = "Report",
    params(("report_id" = uuid::Uuid, Path, description = "Report ID")),
    responses((status = 204, description = "Deleted"), (status = 404, description = "Not found"))
)]
pub async fn delete_report(
    State(app_state): State<AppState>,
    Path(report_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if report exists
    let _report = app_state
        .database
        .submission_reports
        .get_report_by_id(report_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch report: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Report not found".to_string()))?;

    // Delete the report
    app_state
        .database
        .submission_reports
        .delete_report(report_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to delete report: {e}")))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get all action plans for all organizations (DGRV admin view)
/// GET /admin/action-plans
/// Get all action plans for all organizations (DGRV admin view)
#[utoipa::path(
    get,
    path = "/admin/action-plans",
    tag = "Report",
    responses((status = 200, description = "All action plans", body = ActionPlanListResponse))
)]
pub async fn list_all_action_plans(
    State(app_state): State<AppState>,
) -> Result<impl IntoResponse, ApiError> {
    // Get all submissions from the database
    let all_submissions = app_state
        .database
        .assessments_submission
        .get_all_submissions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch all submissions: {e}")))?;

    // Group submissions by organization
    let mut submissions_by_org: std::collections::HashMap<String, Vec<_>> = std::collections::HashMap::new();
    for submission in all_submissions {
        submissions_by_org.entry(submission.org_id.clone()).or_default().push(submission);
    }

    let mut action_plans = Vec::new();

    for (org_id, submissions) in submissions_by_org {
        let mut org_recommendations = Vec::new();
        let mut org_name = "Unknown Organization".to_string();

        for submission in submissions {
            // Update org_name from the first submission
            if org_name == "Unknown Organization" {
                org_name = submission.org_name.clone();
            }

            // Get reports for this submission
            let reports = app_state
                .database
                .submission_reports
                .get_reports_by_submission(submission.submission_id)
                .await
                .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch reports for submission {}: {e}", submission.submission_id)))?;

            for report in reports {
                if let Some(data) = report.data {
                    // Parse the report data to extract recommendations
                    if let Some(categories) = data.as_array() {
                        for category_obj in categories {
                            if let Some(category_map) = category_obj.as_object() {
                                for (category_name, category_data) in category_map {
                                    if let Some(category_obj) = category_data.as_object() {
                                        if let Some(recommendations_array) = category_obj.get("recommendations").and_then(|r| r.as_array()) {
                                            for recommendation_value in recommendations_array {
                                                if let Some(recommendation_map) = recommendation_value.as_object() {
                                                    if let (Some(id_value), Some(text_value), Some(status_value)) = (
                                                        recommendation_map.get("id"),
                                                        recommendation_map.get("text"),
                                                        recommendation_map.get("status")
                                                    ) {
                                                        if let (Some(id_str), Some(text_str), Some(status_str)) = (
                                                            id_value.as_str(),
                                                            text_value.as_str(),
                                                            status_value.as_str()
                                                        ) {
                                                            if let Ok(recommendation_id) = Uuid::parse_str(id_str) {
                                                                let assessment_name = submission.content
                                                                    .get("assessment_name")
                                                                    .and_then(|n| n.as_str())
                                                                    .unwrap_or("Unknown Assessment")
                                                                    .to_string();
                                                                org_recommendations.push(RecommendationWithStatus {
                                                                    recommendation_id,
                                                                    report_id: report.report_id,
                                                                    assessment_id: submission.submission_id,
                                                                    assessment_name,
                                                                    category: category_name.clone(),
                                                                    recommendation: text_str.to_string(),
                                                                    status: status_str.to_string(),
                                                                    created_at: report.generated_at.to_rfc3339(),
                                                                });
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if !org_recommendations.is_empty() {
            action_plans.push(OrganizationActionPlan {
                organization_id: Uuid::parse_str(&org_id).unwrap_or_else(|_| Uuid::nil()),
                organization_name: org_name,
                recommendations: org_recommendations,
            });
        }
    }

    Ok(Json(ActionPlanListResponse { organizations: action_plans }))
}

/// Get all reports for all organizations (DGRV admin view)
/// GET /admin/reports
/// Get all reports for all organizations (DGRV admin view)
#[utoipa::path(
    get,
    path = "/admin/reports",
    tag = "Report",
    responses((status = 200, description = "All reports", body = AdminReportListResponse))
)]
pub async fn list_all_reports(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<impl IntoResponse, ApiError> {
    // Only DGRV admins can access this endpoint
    if !claims.is_application_admin() {
        return Err(ApiError::Forbidden("Only DGRV admins can access all reports".to_string()));
    }

    // Get all reports from the database
    let all_reports = app_state
        .database
        .submission_reports
        .get_all_reports()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch all reports: {e}")))?;

    // Get all submissions to map report submission_id to org_id and org_name
    let all_submissions = app_state
        .database
        .assessments_submission
        .get_all_submissions()
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch all submissions: {e}")))?;

    // Create a mapping from submission_id to (org_id, org_name)
    let submission_org_map: std::collections::HashMap<Uuid, (String, String)> = all_submissions
        .into_iter()
        .map(|submission| (submission.submission_id, (submission.org_id, submission.org_name)))
        .collect();

    // Convert database models to AdminReport models with organization information
    let mut admin_reports = Vec::new();

    for report_model in all_reports {
        let submission_id = report_model.submission_id;
        let (org_id, org_name) = submission_org_map.get(&submission_id)
            .cloned()
            .unwrap_or_else(|| ("unknown".to_string(), "Unknown Organization".to_string()));

        admin_reports.push(AdminReport {
            report_id: report_model.report_id,
            submission_id,
            org_id,
            org_name,
            status: report_model.status,
            generated_at: report_model.generated_at.to_rfc3339(),
            data: report_model.data.unwrap_or(serde_json::Value::Null),
        });
    }

    Ok(Json(AdminReportListResponse { reports: admin_reports }))
}

/// Update recommendation status (for org admins)
/// PATCH /reports/{report_id}/recommendations/{category}/status
/// Update recommendation status (for org admins)
#[utoipa::path(
    put,
    path = "/reports/{report_id}/recommendations/{category}/status",
    tag = "Report",
    params(
        ("report_id" = Uuid, Path, description = "Report ID"),
        ("recommendation_id" = String, Path, description = "Recommendation ID")
    ),
    request_body = UpdateRecommendationStatusRequest,
    responses((status = 200, description = "Updated"), (status = 404, description = "Not found"), (status = 400, description = "Bad request"))
)]
pub async fn update_recommendation_status(
    State(app_state): State<AppState>,
    Path((report_id, recommendation_id)): Path<(Uuid, String)>,
    Json(request): Json<UpdateRecommendationStatusRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let valid_statuses = &["todo", "in_progress", "done", "approved"];
    if !valid_statuses.contains(&request.status.as_str()) {
        return Err(ApiError::BadRequest(format!("Invalid status: {}", request.status)));
    }

    let report = app_state
        .database
        .submission_reports
        .get_report_by_id(report_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Database error: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Report not found".to_string()))?;

    let mut data = report.data.ok_or_else(|| ApiError::InternalServerError("Report data is missing".to_string()))?;
    let mut recommendation_found_and_updated = false;

    if let Some(categories_map) = data.get_mut(0).and_then(|c| c.as_object_mut()) {
        for (_category_name, category_data) in categories_map.iter_mut() {
            if let Some(recs) = category_data.get_mut("recommendations").and_then(|r| r.as_array_mut()) {
                for rec in recs {
                    if rec.get("id").and_then(|id| id.as_str()) == Some(&recommendation_id) {
                        if let Some(rec_obj) = rec.as_object_mut() {
                            rec_obj.insert("status".to_string(), json!(request.status));
                            recommendation_found_and_updated = true;
                            break;
                        }
                    }
                }
            }
            if recommendation_found_and_updated {
                break;
            }
        }
    }

    if recommendation_found_and_updated {
        app_state
            .database
            .submission_reports
            .update_report_status(report_id, report.status, Some(data))
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to update report: {e}")))?;
        Ok(StatusCode::OK)
    } else {
        Err(ApiError::NotFound("Recommendation not found in this report".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_report_content_format() {
        // Test the new format with single recommendation per category
        let sample_submission_content = json!({
            "assessment": {
                "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
                "language": "en"
            },
            "responses": [
                {
                    "files": [],
                    "question_revision_id": "85f4eb49-b1dc-4623-9b72-35fd68b52a75",
                    "response": "[\"{\\\"yesNo\\\":true,\\\"percentage\\\":80,\\\"text\\\":\\\"Our organization has a comprehensive sustainability policy\\\"}\"]",
                    "version": 1,
                },
                {
                    "files": [],
                    "question_revision_id": "066e599a-3a0f-48de-ad03-e23e8ecfea23",
                    "response": "[\"{\\\"yesNo\\\":true,\\\"percentage\\\":75,\\\"text\\\":\\\"We use third-party tools to measure our carbon footprint annually\\\"}\"]",
                    "version": 1,
                },
                {
                    "files": [],
                    "question_revision_id": "987fcdeb-51a2-43d1-b789-123456789abc",
                    "response": "[\"{\\\"yesNo\\\":true,\\\"percentage\\\":90,\\\"text\\\":\\\"We have comprehensive training programs for all employees\\\"}\"]",
                    "version": 1,
                }
            ]
        });

        // Simulate categories and recommendations
        let mut categories: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();
        let mut recommendations: std::collections::HashMap<String, String> = std::collections::HashMap::new();

        // Add sample recommendations
        recommendations.insert("Environmental".to_string(), "Improve environmental policies and increase renewable energy usage".to_string());
        recommendations.insert("Social".to_string(), "Expand employee training and diversity programs".to_string());

        // Extract responses from submission content
        let empty_responses = vec![];
        let responses = sample_submission_content
            .get("responses")
            .and_then(|r| r.as_array())
            .unwrap_or(&empty_responses);

        // Process responses (simulating the new structure)
        for (i, response) in responses.iter().enumerate() {
            if let (Some(_question_revision_id_str), Some(response_str)) = (
                response.get("question_revision_id").and_then(|q| q.as_str()),
                response.get("response").and_then(|r| r.as_str())
            ) {
                // Parse the escaped JSON response string
                let parsed_response: Vec<serde_json::Value> = serde_json::from_str(response_str).unwrap();

                // Extract the complete answer data set from the parsed response
                let answer = if let Some(first_response) = parsed_response.first() {
                    if let Ok(response_obj) = serde_json::from_str::<serde_json::Value>(first_response.as_str().unwrap_or("{}")) {
                        response_obj
                    } else {
                        json!({"text": first_response.as_str().unwrap_or("No response")})
                    }
                } else {
                    json!({"text": "No response"})
                };

                // Simulate category assignment
                let (category, question_text) = match i {
                    0 => ("Environmental", "What is your organization's sustainability policy?"),
                    1 => ("Environmental", "How do you measure carbon footprint?"),
                    2 => ("Social", "What is your employee training program?"),
                    _ => ("Unknown", "Unknown question")
                };

                // Create question/answer object WITHOUT recommendation (recommendation will be added at category level)
                let question_data = json!({
                    "question": question_text,
                    "answer": answer
                });

                // Add this question/answer to the category
                categories.entry(category.to_string())
                    .or_insert_with(Vec::new)
                    .push(question_data);
            }
        }

        // Convert to the NEW format with one recommendation per category
        let mut result_object = serde_json::Map::new();

        for (category, questions) in categories {
            // Get the recommendation for this category
            let recommendation = recommendations.get(&category)
                .cloned()
                .unwrap_or_else(|| "No recommendation provided".to_string());

            // Create category object with questions and single recommendation
            let category_data = json!({
                "questions": questions,
                "recommendation": recommendation
            });

            result_object.insert(category, category_data);
        }

        let result = vec![serde_json::Value::Object(result_object)];
        let final_result = serde_json::Value::Array(result);

        // Verify the NEW structure
        assert!(final_result.is_array());
        let array = final_result.as_array().unwrap();
        assert_eq!(array.len(), 1);

        let categories_obj = &array[0];
        assert!(categories_obj.is_object());

        let obj = categories_obj.as_object().unwrap();
        assert!(obj.contains_key("Environmental"));
        assert!(obj.contains_key("Social"));

        // Check Environmental category - NEW structure
        let env_category = obj.get("Environmental").unwrap();
        assert!(env_category.get("questions").is_some());
        assert!(env_category.get("recommendation").is_some());

        let env_questions = env_category.get("questions").unwrap().as_array().unwrap();
        assert_eq!(env_questions.len(), 2); // 2 questions

        let env_recommendation = env_category.get("recommendation").unwrap().as_str().unwrap();
        assert_eq!(env_recommendation, "Improve environmental policies and increase renewable energy usage");

        // Check Social category - NEW structure
        let social_category = obj.get("Social").unwrap();
        assert!(social_category.get("questions").is_some());
        assert!(social_category.get("recommendation").is_some());

        let social_questions = social_category.get("questions").unwrap().as_array().unwrap();
        assert_eq!(social_questions.len(), 1); // 1 question

        let social_recommendation = social_category.get("recommendation").unwrap().as_str().unwrap();
        assert_eq!(social_recommendation, "Expand employee training and diversity programs");

        println!("Test passed! Generated report content with NEW format (single recommendation per category):");
        println!("{}", serde_json::to_string_pretty(&final_result).unwrap());
    }
}
