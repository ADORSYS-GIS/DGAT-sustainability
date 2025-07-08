use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
    Router,
};
use sea_orm::{Database, DatabaseConnection};
use serde_json::{json, Value};
use std::sync::Arc;
use sustainability_tool::api::routes::create_router;
use sustainability_tool::common::state::AppState;
use tower::ServiceExt;

// Mock AppState for testing
async fn create_test_app_state() -> AppState {
    // Create a mock database connection for testing
    let db: DatabaseConnection = Database::connect("sqlite::memory:").await.unwrap();
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
    assert!(questions_response["meta"].is_object());
}

#[tokio::test]
async fn test_list_questions_with_pagination() {
    let app = create_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/questions?page=1&limit=10")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let questions_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(questions_response["questions"].is_array());
    assert_eq!(questions_response["meta"]["page"], 1);
    assert_eq!(questions_response["meta"]["limit"], 10);
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

    assert_eq!(response.status(), StatusCode::CREATED);
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
