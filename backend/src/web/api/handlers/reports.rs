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
        // Handle the new structure where response contains question_revision_id and escaped JSON response
        if let (Some(question_revision_id_str), Some(response_str)) = (
            response.get("question_revision_id").and_then(|q| q.as_str()),
            response.get("response").and_then(|r| r.as_str())
        ) {
            // Parse the question_revision_id
            let question_revision_id = match Uuid::parse_str(question_revision_id_str) {
                Ok(id) => id,
                Err(_) => continue, // Skip invalid UUIDs
            };

            // Get question revision to get question text and question_id
            let question_revision = match app_state
                .database
                .questions_revisions
                .get_revision_by_id(question_revision_id)
                .await
            {
                Ok(Some(revision)) => revision,
                _ => continue, // Skip if revision not found
            };

            // Get question to get category
            let question = match app_state
                .database
                .questions
                .get_question_by_id(question_revision.question_id)
                .await
            {
                Ok(Some(q)) => q,
                _ => continue, // Skip if question not found
            };

            // Extract question text from the jsonb field (assuming English for now)
            let question_text = question_revision.text
                .get("en")
                .and_then(|t| t.as_str())
                .unwrap_or("Unknown question");

            let category = &question.category;

            // Parse the response string directly (no longer an array)
            let answer = if let Ok(response_obj) = serde_json::from_str::<serde_json::Value>(response_str) {
                response_obj
            } else {
                json!({"text": response_str})
            };

            // Include responses if all categories are requested or if this category is specifically requested
            if include_all_categories || requested_categories.contains(category) {
                // Create question/answer object WITHOUT recommendation (recommendation will be added at category level)
                let question_data = serde_json::json!({
                    "question": question_text,
                    "answer": answer
                });

                // Add this question/answer to the category (supporting multiple questions per category)
                categories.entry(category.to_string())
                    .or_insert_with(Vec::new)
                    .push(question_data);
            }
        }
    }

    // Convert to the required format with one recommendation per category
    // [{"category1": [{"question": "question_text", "answer": "answer_content"}, ...], "recommendation": "recommendation_text", "category2": [...]}]
    let mut result_object = serde_json::Map::new();

    for (category, questions) in categories {
        // Get the recommendation for this category
        let recommendation = recommendations.get(&category)
            .cloned()
            .unwrap_or_else(|| "No recommendation provided".to_string());

        // Create category object with questions and single recommendation
        let category_data = serde_json::json!({
            "questions": questions,
            "recommendation": recommendation
        });

        result_object.insert(category, category_data);
    }

    let result = vec![serde_json::Value::Object(result_object)];

    Ok(serde_json::Value::Array(result))
}



/// List all reports for the authenticated organization
/// GET /user/reports
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
