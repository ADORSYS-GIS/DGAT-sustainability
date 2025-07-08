use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    Router,
};
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;
use serde_json::{json, Value};
use std::sync::Arc;
use sustainability_tool::api::routes::create_router;
use sustainability_tool::common::state::AppState;
use sustainability_tool::common::migrations::Migrator;
use tower::ServiceExt;

// Mock AppState for testing
async fn create_test_app_state() -> AppState {
    // Create a mock database connection for testing
    let db: DatabaseConnection = Database::connect("sqlite::memory:").await.unwrap();

    // Run migrations on the test database
    Migrator::up(&db, None).await.unwrap();

    AppState::new(Arc::new(db)).await
}

async fn create_test_app() -> Router {
    let app_state = create_test_app_state().await;
    create_router(app_state)
}

#[tokio::test]
async fn test_health_check() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let health_response: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(health_response["status"], "healthy");
    assert!(health_response["timestamp"].is_string());
    assert!(health_response["version"].is_string());
    assert_eq!(health_response["checks"]["database"], "up");
    assert_eq!(health_response["checks"]["keycloak"], "up");
}

#[tokio::test]
async fn test_metrics() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let metrics_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(metrics_response["uptime"].is_number());
    assert!(metrics_response["requests"]["total"].is_number());
    assert!(metrics_response["requests"]["per_second"].is_number());
    assert!(metrics_response["memory"]["used"].is_number());
    assert!(metrics_response["memory"]["total"].is_number());
    assert!(metrics_response["database"]["connections"].is_number());
    assert!(metrics_response["database"]["queries_per_second"].is_number());
}

#[tokio::test]
async fn test_list_questions() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/questions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let questions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(questions_response["questions"].is_array());
}

#[tokio::test]
async fn test_list_questions_with_language_filter() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/questions?language=en")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let questions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(questions_response["questions"].is_array());
}

#[tokio::test]
async fn test_create_question() {
    let app = create_test_app().await;

    let new_question = json!({
        "category": "sustainability",
        "text": {
            "en": "What is your carbon footprint?",
            "fr": "Quelle est votre empreinte carbone?"
        },
        "weight": 0.8
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions")
                .header("content-type", "application/json")
                .body(Body::from(new_question.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    if status != StatusCode::CREATED {
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let error_response = String::from_utf8(body.to_vec()).unwrap();
        println!("Error response: {}", error_response);
        panic!("Expected 201 CREATED, got {}", status);
    }

    assert_eq!(status, StatusCode::CREATED);
}

#[tokio::test]
async fn test_create_question_invalid_weight() {
    let app = create_test_app().await;

    let invalid_question = json!({
        "category": "sustainability",
        "text": {
            "en": "What is your carbon footprint?"
        },
        "weight": 1.5  // Invalid weight > 1
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions")
                .header("content-type", "application/json")
                .body(Body::from(invalid_question.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_create_question_with_translation() {
    let app = create_test_app().await;

    let question_with_translation = json!({
        "category": "sustainability",
        "source_text": "What is your sustainability policy?",
        "source_language": "en",
        "target_languages": ["fr", "es", "de"],
        "weight": 0.8
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions/with-translation")
                .header("content-type", "application/json")
                .body(Body::from(question_with_translation.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let question_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(question_response["question"].is_object());
    assert!(question_response["question"]["latest_revision"]["text"].is_object());

    let text_obj = &question_response["question"]["latest_revision"]["text"];
    assert!(text_obj["en"].is_string());
    assert!(text_obj["fr"].is_string());
    assert!(text_obj["es"].is_string());
    assert!(text_obj["de"].is_string());

    // Verify the source text is preserved
    assert_eq!(text_obj["en"], "What is your sustainability policy?");

    // Verify translations contain expected content (mock translations)
    assert!(text_obj["fr"].as_str().unwrap().contains("politique de durabilité"));
    assert!(text_obj["es"].as_str().unwrap().contains("política de sostenibilidad"));
    assert!(text_obj["de"].as_str().unwrap().contains("Nachhaltigkeitspolitik"));
}

#[tokio::test]
async fn test_create_question_with_translation_invalid_language() {
    let app = create_test_app().await;

    let invalid_question = json!({
        "category": "sustainability",
        "source_text": "What is your sustainability policy?",
        "source_language": "invalid",
        "target_languages": ["fr", "es"],
        "weight": 0.8
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions/with-translation")
                .header("content-type", "application/json")
                .body(Body::from(invalid_question.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_create_question_with_translation_empty_text() {
    let app = create_test_app().await;

    let invalid_question = json!({
        "category": "sustainability",
        "source_text": "",
        "source_language": "en",
        "target_languages": ["fr", "es"],
        "weight": 0.8
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions/with-translation")
                .header("content-type", "application/json")
                .body(Body::from(invalid_question.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_list_assessments() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/assessments")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let assessments_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(assessments_response["assessments"].is_array());
    assert!(assessments_response["meta"].is_object());
}

#[tokio::test]
async fn test_create_assessment() {
    let app = create_test_app().await;

    let new_assessment = json!({
        "language": "en"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/assessments")
                .header("content-type", "application/json")
                .body(Body::from(new_assessment.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_invalid_endpoint() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/nonexistent")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

// Admin endpoint tests
#[tokio::test]
async fn test_admin_list_all_submissions() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/admin/submissions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let submissions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(submissions_response["submissions"].is_array());
}

#[tokio::test]
async fn test_admin_list_all_submissions_with_filters() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/admin/submissions?status=pending_review&reviewer_id=reviewer123")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let submissions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(submissions_response["submissions"].is_array());
}

#[tokio::test]
async fn test_admin_list_all_reviews() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/admin/reviews")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let reviews_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(reviews_response["reviews"].is_array());
}

#[tokio::test]
async fn test_admin_assign_reviewer() {
    let app = create_test_app().await;

    let assignment_request = json!({
        "submission_id": "550e8400-e29b-41d4-a716-446655440000",
        "reviewer_id": "reviewer123"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/admin/reviews/assign")
                .header("content-type", "application/json")
                .body(Body::from(assignment_request.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let assignment_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(assignment_response["review_id"].is_string());
    assert!(assignment_response["submission_id"].is_string());
    assert!(assignment_response["reviewer_id"].is_string());
    assert!(assignment_response["assigned_at"].is_string());
}

// Submissions endpoint tests
#[tokio::test]
async fn test_list_user_submissions() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/submissions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let submissions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(submissions_response["submissions"].is_array());
}

#[tokio::test]
async fn test_get_submission() {
    let app = create_test_app().await;

    let submission_id = "550e8400-e29b-41d4-a716-446655440000";
    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/submissions/{}", submission_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let submission_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(submission_response["submission"].is_object());
    assert!(submission_response["submission"]["assessment_id"].is_string());
    assert!(submission_response["submission"]["user_id"].is_string());
    assert!(submission_response["submission"]["content"].is_object());
}

// Reviews endpoint tests
#[tokio::test]
async fn test_get_submission_reviews() {
    let app = create_test_app().await;

    let submission_id = "550e8400-e29b-41d4-a716-446655440000";
    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/submissions/{}/reviews", submission_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let reviews_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(reviews_response["reviews"].is_array());
}

#[tokio::test]
async fn test_create_review() {
    let app = create_test_app().await;

    let submission_id = "550e8400-e29b-41d4-a716-446655440000";
    let review_request = json!({
        "decision": "approved",
        "comments": "Great sustainability practices demonstrated"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(&format!("/api/submissions/{}/reviews", submission_id))
                .header("content-type", "application/json")
                .body(Body::from(review_request.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let review_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(review_response["review"].is_object());
    assert!(review_response["review"]["review_id"].is_string());
    assert!(review_response["review"]["decision"].is_string());
}

#[tokio::test]
async fn test_get_review() {
    let app = create_test_app().await;

    let review_id = "550e8400-e29b-41d4-a716-446655440000";
    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/reviews/{}", review_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let review_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(review_response["review"].is_object());
    assert!(review_response["submission"].is_object());
    assert!(review_response["review"]["review_id"].is_string());
    assert!(review_response["review"]["status"].is_string());
}

#[tokio::test]
async fn test_update_review() {
    let app = create_test_app().await;

    let review_id = "550e8400-e29b-41d4-a716-446655440000";
    let update_request = json!({
        "status": "completed",
        "decision": "approved",
        "comments": "Updated review with additional feedback"
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(&format!("/api/reviews/{}", review_id))
                .header("content-type", "application/json")
                .body(Body::from(update_request.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let review_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(review_response["review"].is_object());
    assert!(review_response["review"]["review_id"].is_string());
    assert!(review_response["review"]["status"].is_string());
}

#[tokio::test]
async fn test_get_question_success() {
    let app = create_test_app().await;

    // First create a question
    let new_question = json!({
        "category": "sustainability",
        "text": {
            "en": "What is your carbon footprint?",
            "fr": "Quelle est votre empreinte carbone?"
        },
        "weight": 0.8
    });

    let create_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/questions")
                .header("content-type", "application/json")
                .body(Body::from(new_question.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_response.status(), StatusCode::CREATED);

    // Extract the question ID from the create response
    let create_body = to_bytes(create_response.into_body(), usize::MAX).await.unwrap();
    let create_response_json: Value = serde_json::from_slice(&create_body).unwrap();
    let question_id = create_response_json["question"]["question_id"].as_str().unwrap();

    // Now retrieve the question
    let get_response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/questions/{}", question_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);

    let get_body = to_bytes(get_response.into_body(), usize::MAX).await.unwrap();
    let question_response: Value = serde_json::from_slice(&get_body).unwrap();

    // Verify the response structure
    assert!(question_response["question"].is_object());
    assert_eq!(question_response["question"]["question_id"], question_id);
    assert_eq!(question_response["question"]["category"], "sustainability");
    assert!(question_response["question"]["latest_revision"].is_object());
    assert!(question_response["question"]["latest_revision"]["text"].is_object());
    assert_eq!(question_response["question"]["latest_revision"]["text"]["en"], "What is your carbon footprint?");
    assert_eq!(question_response["question"]["latest_revision"]["text"]["fr"], "Quelle est votre empreinte carbone?");
    // Check weight with floating point tolerance due to f32/f64 conversion
    let weight = question_response["question"]["latest_revision"]["weight"].as_f64().unwrap();
    assert!((weight - 0.8).abs() < 0.001, "Expected weight ~0.8, got {}", weight);
}

#[tokio::test]
async fn test_get_question_not_found() {
    let app = create_test_app().await;

    // Try to get a non-existent question
    let non_existent_id = "550e8400-e29b-41d4-a716-446655440000";
    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/questions/{}", non_existent_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let error_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(error_response["error"].is_string());
    assert!(error_response["error"].as_str().unwrap().contains("Question not found"));
}
