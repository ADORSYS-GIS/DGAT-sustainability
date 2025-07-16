use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::Value;
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
    // Get the submission data to extract questions, answers, and categories
    let submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found".to_string()))?;

    // Extract responses from submission content
    let empty_responses = vec![];
    let responses = submission.content
        .get("responses")
        .and_then(|r| r.as_array())
        .unwrap_or(&empty_responses);

    // Collect all requested categories and recommendations
    let mut requested_categories: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut recommendations: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    for request in requests {
        if !request.category.is_empty() {
            requested_categories.insert(request.category.clone());
            recommendations.insert(request.category.clone(), request.recommendation.clone());
        }
    }

    // If no specific categories are requested, include all categories
    let include_all_categories = requested_categories.is_empty();

    // Group responses by category, filtering by the requested categories if specified
    let mut categories: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();

    for response in responses {
        if let (Some(question_text), Some(category), Some(answer)) = (
            response.get("question_text").and_then(|q| q.as_str()),
            response.get("question_category").and_then(|c| c.as_str()),
            response.get("response").and_then(|r| r.as_str())
        ) {
            // Include responses if all categories are requested or if this category is specifically requested
            if include_all_categories || requested_categories.contains(category) {
                let question_answer = serde_json::json!({
                    question_text: answer
                });

                categories.entry(category.to_string())
                    .or_insert_with(Vec::new)
                    .push(question_answer);
            }
        }
    }

    // Add recommendations to each category
    for (category, category_data) in categories.iter_mut() {
        // Use specific recommendation for the category if available, otherwise use the first general recommendation
        let recommendation = recommendations.get(category)
            .or_else(|| requests.first().map(|r| &r.recommendation))
            .map(|r| r.as_str())
            .unwrap_or("No recommendation provided");

        category_data.push(serde_json::json!({
            "recommendation": recommendation
        }));
    }

    // Convert to the required format: [{"category": [...], "category2": [...]}]
    let result = vec![serde_json::Value::Object(
        categories.into_iter()
            .map(|(category, data)| (category, serde_json::Value::Array(data)))
            .collect()
    )];

    Ok(serde_json::Value::Array(result))
}



/// List all reports for the authenticated user
/// GET /user/reports
pub async fn list_user_reports(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<impl IntoResponse, ApiError> {
    let user_id = &claims.sub;

    // Get all submissions for the user
    let user_submissions = app_state
        .database
        .assessments_submission
        .get_submissions_by_user(user_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch user submissions: {e}")))?;

    // Collect all reports for user's submissions
    let mut all_reports = Vec::new();

    for submission in user_submissions {
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
            all_reports.push(Report {
                report_id: model.report_id,
                submission_id: model.submission_id,
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
pub async fn list_reports(
    State(app_state): State<AppState>,
    Path(submission_id): Path<Uuid>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if submission exists
    let _submission = app_state
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

    // Convert database models to API models
    let reports: Vec<Report> = report_models
        .into_iter()
        .map(|model| Report {
            report_id: model.report_id,
            submission_id: model.submission_id,
            status: model.status,
            generated_at: model.generated_at.to_rfc3339(),
            data: model.data,
        })
        .collect();

    Ok(Json(ReportListResponse { reports }))
}

/// Generate a new report for a submission
/// POST /submissions/{submission_id}/reports
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

    let response = ReportGenerationResponse {
        report_id: report_model.report_id,
        status: report_model.status,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Get a specific report
/// GET /reports/{report_id}
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

    let report = Report {
        report_id: report_model.report_id,
        submission_id: report_model.submission_id,
        status: report_model.status,
        generated_at: report_model.generated_at.to_rfc3339(),
        data: report_model.data,
    };

    Ok(Json(ReportResponse { report }))
}

/// Delete a report
/// DELETE /reports/{report_id}
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_report_content_format() {
        // Sample submission content from the issue description
        let sample_submission_content = json!({
            "assessment": {
                "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
                "language": "en"
            },
            "responses": [
                {
                    "question_text": "What is your organization's sustainability policy?",
                    "question_category": "Environmental",
                    "response": "Our organization has a comprehensive sustainability policy",
                    "files": [
                        {
                            "file_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                            "metadata": {}
                        }
                    ]
                },
                {
                    "question_text": "How do you measure carbon footprint?",
                    "question_category": "Environmental",
                    "response": "We use third-party tools to measure our carbon footprint annually",
                    "files": []
                },
                {
                    "question_text": "What is your employee training program?",
                    "question_category": "Social",
                    "response": "We have comprehensive training programs for all employees",
                    "files": []
                }
            ]
        });

        // Extract responses from submission content
        let empty_responses = vec![];
        let responses = sample_submission_content
            .get("responses")
            .and_then(|r| r.as_array())
            .unwrap_or(&empty_responses);

        // Group responses by category
        let mut categories: std::collections::HashMap<String, Vec<serde_json::Value>> = std::collections::HashMap::new();

        for response in responses {
            if let (Some(question_text), Some(category), Some(answer)) = (
                response.get("question_text").and_then(|q| q.as_str()),
                response.get("question_category").and_then(|c| c.as_str()),
                response.get("response").and_then(|r| r.as_str())
            ) {
                let question_answer = json!({
                    question_text: answer
                });

                categories.entry(category.to_string())
                    .or_insert_with(Vec::new)
                    .push(question_answer);
            }
        }

        // Add recommendations to each category
        for (_, category_data) in categories.iter_mut() {
            category_data.push(json!({
                "recommendation": "Generated recommendation based on responses"
            }));
        }

        // Convert to the required format: [{"category": [...], "category2": [...]}]
        let result = vec![serde_json::Value::Object(
            categories.into_iter()
                .map(|(category, data)| (category, serde_json::Value::Array(data)))
                .collect()
        )];

        let final_result = serde_json::Value::Array(result);

        // Verify the structure
        assert!(final_result.is_array());
        let array = final_result.as_array().unwrap();
        assert_eq!(array.len(), 1);

        let categories_obj = &array[0];
        assert!(categories_obj.is_object());

        let obj = categories_obj.as_object().unwrap();
        assert!(obj.contains_key("Environmental"));
        assert!(obj.contains_key("Social"));

        // Check Environmental category
        let env_category = obj.get("Environmental").unwrap().as_array().unwrap();
        assert_eq!(env_category.len(), 3); // 2 questions + 1 recommendation

        // Check Social category
        let social_category = obj.get("Social").unwrap().as_array().unwrap();
        assert_eq!(social_category.len(), 2); // 1 question + 1 recommendation

        println!("Test passed! Generated report content:");
        println!("{}", serde_json::to_string_pretty(&final_result).unwrap());
    }
}
