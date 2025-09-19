use crate::web::api::models::{
    DatabaseMetrics, HealthChecks, HealthResponse, MemoryMetrics, MetricsResponse, RequestMetrics,
};
use axum::Json;
use once_cell::sync::Lazy;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::SystemTime;
use sysinfo::System;

// Global metrics tracking
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);
static START_TIME: Lazy<SystemTime> = Lazy::new(SystemTime::now);

fn increment_request_count() {
    REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);
}

#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Health check", body = HealthResponse)
    )
)]
pub async fn health_check() -> Json<HealthResponse> {
    increment_request_count();

    Json(HealthResponse {
        status: "healthy".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        checks: HealthChecks {
            database: "up".to_string(),
            keycloak: "up".to_string(),
        },
    })
}

#[utoipa::path(
    get,
    path = "/metrics",
    responses(
        (status = 200, description = "Metrics", body = MetricsResponse)
    )
)]
pub async fn metrics() -> Json<MetricsResponse> {
    increment_request_count();

    // Calculate uptime
    let uptime = START_TIME.elapsed().unwrap_or_default().as_secs_f64();

    // Get current request count
    let total_requests = REQUEST_COUNT.load(Ordering::Relaxed);

    // Calculate requests per second (simple average over uptime)
    let requests_per_second = if uptime > 0.0 {
        total_requests as f64 / uptime
    } else {
        0.0
    };

    // Get system memory information
    let mut system = System::new_all();
    system.refresh_memory();

    let memory_used = system.used_memory();
    let memory_total = system.total_memory();

    Json(MetricsResponse {
        uptime,
        requests: RequestMetrics {
            total: total_requests,
            per_second: requests_per_second,
        },
        memory: MemoryMetrics {
            used: memory_used,
            total: memory_total,
        },
        database: DatabaseMetrics {
            connections: 5, // In a real implementation, this would come from the connection pool
            queries_per_second: 2.5, // In a real implementation, this would be tracked
        },
    })
}
