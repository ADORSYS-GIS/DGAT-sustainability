use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
    middleware, Router,
};
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;
use serde_json::{json, Value};
use std::sync::Arc;

use sustainability_tool::common::migrations::Migrator;
use sustainability_tool::common::models::claims::Claims;
use sustainability_tool::web::routes::AppState;
use sustainability_tool::common::state::AppDatabase;
use sustainability_tool::web::api::routes::create_router;
use tower::ServiceExt;

// Mock authentication middleware for testing
async fn mock_auth_middleware(
    mut request: axum::extract::Request,
    next: middleware::Next,
) -> axum::response::Response {
    // Create mock claims for testing
    let mock_claims = Claims {
        sub: "test-user-123".to_string(),
        organizations: sustainability_tool::common::models::claims::Organizations {
            orgs: std::collections::HashMap::from([(
                "test-organization".to_string(),
                sustainability_tool::common::models::claims::OrganizationInfo {
                    categories: vec!["environment".to_string(), "social".to_string()],
                },
            )]),
        },
        realm_access: Some(sustainability_tool::common::models::claims::RealmAccess {
            roles: vec!["user".to_string()],
        }),
        preferred_username: "testuser".to_string(),
        email: Some("test@example.com".to_string()),
        given_name: Some("Test".to_string()),
        family_name: Some("User".to_string()),
        exp: 9999999999, // Far future expiration
        iat: 1000000000, // Past issued time
        aud: serde_json::Value::String("test-audience".to_string()),
        iss: "test-issuer".to_string(),
    };

    // Add claims to request extensions
    request.extensions_mut().insert(mock_claims);

    next.run(request).await
}

// Mock AppState for testing
async fn create_test_app_state() -> AppState {
    // Create a mock database connection for testing
    let db: DatabaseConnection = Database::connect("sqlite::memory:").await.unwrap();

    // Run migrations on the test database
    Migrator::up(&db, None).await.unwrap();

    // Create AppDatabase
    let app_database = AppDatabase::new(Arc::new(db)).await;

    AppState::new(
        "http://localhost:8080".to_string(),
        "test-realm".to_string(),
        app_database,
    )
    .await
}

async fn create_test_app() -> Router {
    let app_state = create_test_app_state().await;
    create_router(app_state).layer(middleware::from_fn(mock_auth_middleware))
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
        println!("Error response: {error_response}");
        panic!("Expected 201 CREATED, got {status}");
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
        "weight": 0
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
                .uri("/api/admin/submissions?status=pending_review")
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

    // Check if we get a successful response or print the error
    let status = response.status();
    if status != StatusCode::OK {
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let error_text = String::from_utf8_lossy(&body);
        println!("Error response: {error_text}");
        panic!("Expected 200 OK, got {status}");
    }

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
                .uri(&format!("/api/submissions/{submission_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // Expect 404 since the submission doesn't exist in the test database
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let error_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(error_response["error"].is_string());
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

    // Extract the question ID from the creation response
    let create_body = to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let create_response_json: Value = serde_json::from_slice(&create_body).unwrap();
    let question_id = create_response_json["question"]["question_id"]
        .as_str()
        .unwrap();

    // Now retrieve the question
    let get_response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/questions/{question_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_response.status(), StatusCode::OK);

    let get_body = to_bytes(get_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let question_response: Value = serde_json::from_slice(&get_body).unwrap();

    // Verify the response structure
    assert!(question_response["question"].is_object());
    assert_eq!(question_response["question"]["question_id"], question_id);
    assert_eq!(question_response["question"]["category"], "sustainability");
    assert!(question_response["question"]["latest_revision"].is_object());
    assert!(question_response["question"]["latest_revision"]["text"].is_object());
    assert_eq!(
        question_response["question"]["latest_revision"]["text"]["en"],
        "What is your carbon footprint?"
    );
    assert_eq!(
        question_response["question"]["latest_revision"]["text"]["fr"],
        "Quelle est votre empreinte carbone?"
    );
    // Check weight with floating point tolerance due to f32/f64 conversion
    let weight = question_response["question"]["latest_revision"]["weight"]
        .as_f64()
        .unwrap();
    assert!(
        (weight - 0.8).abs() < 0.001,
        "Expected weight ~0.8, got {}",
        weight
    );
}

#[tokio::test]
async fn test_get_question_not_found() {
    let app = create_test_app().await;

    // Try to get a non-existent question
    let non_existent_id = "550e8400-e29b-41d4-a716-446655440000";
    let response = app
        .oneshot(
            Request::builder()
                .uri(&format!("/api/questions/{non_existent_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let error_response: Value = serde_json::from_slice(&body).unwrap();

    assert!(error_response["error"].is_string());
    assert!(error_response["error"]
        .as_str()
        .unwrap()
        .contains("Question not found"));
}
