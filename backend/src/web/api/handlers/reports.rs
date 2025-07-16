use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use uuid::Uuid;

use crate::common::models::claims::Claims;
use crate::web::routes::AppState;
use crate::web::api::error::ApiError;
use crate::web::api::models::*;

#[derive(Deserialize)]
pub struct ListReportsQuery {
    report_type: Option<String>,
}

/// Helper function to process report data and generate report content
fn generate_report_content(data: &Value, report_type: &str) -> Result<Value, ApiError> {
    let categories = data.as_array()
        .ok_or_else(|| ApiError::BadRequest("Report data must be an array".to_string()))?;

    let mut report_content = json!({
        "report_type": report_type,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "summary": {},
        "categories": {},
        "recommendations": [],
        "scores": {}
    });

    let mut total_score = 0.0;
    let mut total_questions = 0;
    let mut all_recommendations = Vec::new();
    let mut category_results = HashMap::new();

    // Process each category
    for category_data in categories {
        if let Some(category_obj) = category_data.as_object() {
            for (category_name, category_items) in category_obj {
                let items = category_items.as_array()
                    .ok_or_else(|| ApiError::BadRequest(format!("Category '{}' must contain an array", category_name)))?;

                let mut category_score = 0.0;
                let mut category_questions = 0;
                let mut category_answers = Vec::new();
                let mut category_recommendations = Vec::new();

                // Process each item in the category
                for item in items {
                    if let Some(item_obj) = item.as_object() {
                        // Check for recommendations
                        if let Some(recommendation) = item_obj.get("recommendation") {
                            if let Some(rec_str) = recommendation.as_str() {
                                if !rec_str.is_empty() {
                                    category_recommendations.push(rec_str.to_string());
                                    all_recommendations.push(json!({
                                        "category": category_name,
                                        "recommendation": rec_str
                                    }));
                                }
                            }
                        }

                        // Process question-answer pairs
                        for (key, value) in item_obj {
                            if key != "recommendation" && !key.is_empty() {
                                if let Some(answer) = value.as_str() {
                                    if !answer.is_empty() {
                                        category_answers.push(json!({
                                            "question": key,
                                            "answer": answer
                                        }));
                                        category_questions += 1;

                                        // Simple scoring logic based on answer content
                                        let score = calculate_answer_score(answer, report_type);
                                        category_score += score;
                                    }
                                }
                            }
                        }
                    }
                }

                // Calculate category average score
                let category_avg_score = if category_questions > 0 {
                    category_score / category_questions as f64
                } else {
                    0.0
                };

                category_results.insert(category_name.clone(), json!({
                    "name": category_name,
                    "score": category_avg_score,
                    "questions_count": category_questions,
                    "answers": category_answers,
                    "recommendations": category_recommendations
                }));

                total_score += category_score;
                total_questions += category_questions;
            }
        }
    }

    // Calculate overall score
    let overall_score = if total_questions > 0 {
        total_score / total_questions as f64
    } else {
        0.0
    };

    // Generate summary based on report type
    let summary = generate_summary(report_type, overall_score, total_questions, &category_results);

    // Update report content
    report_content["summary"] = summary;
    report_content["categories"] = json!(category_results);
    report_content["recommendations"] = json!(all_recommendations);
    report_content["scores"] = json!({
        "overall_score": overall_score,
        "total_questions": total_questions,
        "score_interpretation": interpret_score(overall_score, report_type)
    });

    Ok(report_content)
}

/// Helper function to calculate score based on answer content
fn calculate_answer_score(answer: &str, report_type: &str) -> f64 {
    let answer_lower = answer.to_lowercase();

    match report_type {
        "sustainability" => {
            if answer_lower.contains("excellent") || answer_lower.contains("very good") || answer_lower.contains("yes") {
                5.0
            } else if answer_lower.contains("good") || answer_lower.contains("mostly") {
                4.0
            } else if answer_lower.contains("average") || answer_lower.contains("sometimes") {
                3.0
            } else if answer_lower.contains("poor") || answer_lower.contains("rarely") {
                2.0
            } else if answer_lower.contains("very poor") || answer_lower.contains("no") || answer_lower.contains("never") {
                1.0
            } else {
                3.0 // Default neutral score
            }
        },
        "compliance" => {
            if answer_lower.contains("fully compliant") || answer_lower.contains("yes") || answer_lower.contains("complete") {
                5.0
            } else if answer_lower.contains("mostly compliant") || answer_lower.contains("partial") {
                4.0
            } else if answer_lower.contains("partially compliant") {
                3.0
            } else if answer_lower.contains("non-compliant") || answer_lower.contains("no") {
                1.0
            } else {
                3.0
            }
        },
        _ => {
            // Generic scoring for summary and detailed reports
            if answer_lower.len() > 100 {
                4.0 // Detailed answers get higher scores
            } else if answer_lower.len() > 50 {
                3.5
            } else if answer_lower.len() > 20 {
                3.0
            } else {
                2.5
            }
        }
    }
}

/// Helper function to generate summary based on report type and data
fn generate_summary(report_type: &str, overall_score: f64, total_questions: i32, category_results: &HashMap<String, Value>) -> Value {
    let performance_level = if overall_score >= 4.5 {
        "Excellent"
    } else if overall_score >= 3.5 {
        "Good"
    } else if overall_score >= 2.5 {
        "Average"
    } else if overall_score >= 1.5 {
        "Below Average"
    } else {
        "Poor"
    };

    let mut key_findings = Vec::new();
    let mut areas_for_improvement = Vec::new();

    // Analyze categories for insights
    for (category_name, category_data) in category_results {
        if let Some(score) = category_data.get("score").and_then(|s| s.as_f64()) {
            if score >= 4.0 {
                key_findings.push(format!("{} shows strong performance", category_name));
            } else if score <= 2.0 {
                areas_for_improvement.push(format!("{} requires significant improvement", category_name));
            }
        }
    }

    json!({
        "overall_performance": performance_level,
        "overall_score": overall_score,
        "total_questions_answered": total_questions,
        "categories_assessed": category_results.len(),
        "key_findings": key_findings,
        "areas_for_improvement": areas_for_improvement,
        "report_type_specific": match report_type {
            "sustainability" => json!({
                "sustainability_rating": performance_level,
                "environmental_impact": if overall_score >= 3.5 { "Positive" } else { "Needs Improvement" },
                "sustainability_goals_alignment": format!("{}% aligned", (overall_score / 5.0 * 100.0) as i32)
            }),
            "compliance" => json!({
                "compliance_status": if overall_score >= 4.0 { "Compliant" } else if overall_score >= 3.0 { "Partially Compliant" } else { "Non-Compliant" },
                "risk_level": if overall_score >= 4.0 { "Low" } else if overall_score >= 3.0 { "Medium" } else { "High" },
                "compliance_percentage": format!("{}%", (overall_score / 5.0 * 100.0) as i32)
            }),
            "summary" => json!({
                "executive_summary": format!("Assessment completed with {} performance across {} categories", performance_level.to_lowercase(), category_results.len()),
                "next_steps": if overall_score < 3.0 { "Immediate action required" } else { "Continue monitoring and improvement" }
            }),
            "detailed" => json!({
                "analysis_depth": "Comprehensive",
                "data_completeness": format!("{}%", if total_questions > 0 { 100 } else { 0 }),
                "detailed_insights": "Full category breakdown and recommendations provided"
            }),
            _ => json!({})
        }
    })
}

/// Helper function to interpret the overall score
fn interpret_score(score: f64, report_type: &str) -> String {
    match report_type {
        "sustainability" => {
            if score >= 4.5 {
                "Outstanding sustainability practices with minimal environmental impact".to_string()
            } else if score >= 3.5 {
                "Good sustainability practices with room for optimization".to_string()
            } else if score >= 2.5 {
                "Average sustainability practices requiring focused improvements".to_string()
            } else {
                "Sustainability practices need significant enhancement".to_string()
            }
        },
        "compliance" => {
            if score >= 4.5 {
                "Fully compliant with all regulatory requirements".to_string()
            } else if score >= 3.5 {
                "Generally compliant with minor areas needing attention".to_string()
            } else if score >= 2.5 {
                "Partially compliant with several areas requiring remediation".to_string()
            } else {
                "Non-compliant status requiring immediate corrective action".to_string()
            }
        },
        _ => {
            if score >= 4.5 {
                "Excellent performance across all assessed areas".to_string()
            } else if score >= 3.5 {
                "Good performance with opportunities for enhancement".to_string()
            } else if score >= 2.5 {
                "Satisfactory performance with areas for improvement".to_string()
            } else {
                "Performance below expectations requiring attention".to_string()
            }
        }
    }
}

/// List all reports for the authenticated user
/// GET /user/reports
pub async fn list_user_reports(
    State(app_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListReportsQuery>,
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
        let report_models = if let Some(ref report_type) = params.report_type {
            app_state
                .database
                .submission_reports
                .get_reports_by_submission_and_type(submission_id, report_type.clone())
                .await
        } else {
            app_state
                .database
                .submission_reports
                .get_reports_by_submission(submission_id)
                .await
        }
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch reports for submission {}: {e}", submission_id)))?;

        // Convert database models to API models and add to collection
        for model in report_models {
            all_reports.push(Report {
                report_id: model.report_id,
                submission_id: model.submission_id,
                report_type: model.report_type,
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
    Query(params): Query<ListReportsQuery>,
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
    let report_models = if let Some(report_type) = params.report_type {
        app_state
            .database
            .submission_reports
            .get_reports_by_submission_and_type(submission_id, report_type)
            .await
    } else {
        app_state
            .database
            .submission_reports
            .get_reports_by_submission(submission_id)
            .await
    }
    .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch reports: {e}")))?;

    // Convert database models to API models
    let reports: Vec<Report> = report_models
        .into_iter()
        .map(|model| Report {
            report_id: model.report_id,
            submission_id: model.submission_id,
            report_type: model.report_type,
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
    Json(request): Json<GenerateReportRequest>,
) -> Result<impl IntoResponse, ApiError> {
    // Check if submission exists
    let _submission = app_state
        .database
        .assessments_submission
        .get_submission_by_assessment_id(submission_id)
        .await
        .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch submission: {e}")))?
        .ok_or_else(|| ApiError::NotFound("Submission not found".to_string()))?;

    // Validate report type
    let valid_types = ["sustainability", "compliance", "summary", "detailed"];
    if !valid_types.contains(&request.report_type.as_str()) {
        return Err(ApiError::BadRequest(format!(
            "Invalid report type. Must be one of: {}",
            valid_types.join(", ")
        )));
    }

    // Generate the actual report content using the provided data
    let report_content = generate_report_content(&request.data, &request.report_type)?;

    // Create the report with initial "generating" status
    let mut report_model = app_state
        .database
        .submission_reports
        .create_report(submission_id, request.report_type, request.options)
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
        report_type: report_model.report_type,
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
