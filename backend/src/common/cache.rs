use std::collections::HashMap;
use std::cell::RefCell;
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;
use tokio::task_local;

use crate::common::database::entity::assessments::Model as AssessmentModel;
use crate::common::database::entity::assessments_submission::Model as SubmissionModel;
use crate::common::database::entity::file::Model as FileModel;

/// Request-level cache for storing frequently accessed data within a single request
#[derive(Default)]
pub struct RequestCache {
    /// Cache for assessment models by assessment_id
    assessments: RefCell<HashMap<Uuid, AssessmentModel>>,
    /// Cache for submission status by assessment_id (None means no submission)
    submissions: RefCell<HashMap<Uuid, Option<SubmissionModel>>>,
    /// Cache for file models by file_id
    files: RefCell<HashMap<Uuid, FileModel>>,
    /// Cache for files by response_id
    response_files: RefCell<HashMap<Uuid, Vec<FileModel>>>,
    /// Cache for assessment responses by assessment_id
    assessment_responses: RefCell<HashMap<Uuid, Vec<crate::common::database::entity::assessments_response::Model>>>,
    /// Cache for temp submissions by assessment_id
    temp_submissions: RefCell<HashMap<Uuid, Option<crate::common::database::entity::temp_submission::Model>>>,
}

impl RequestCache {
    pub fn new() -> Self {
        Self::default()
    }

    // Assessment caching methods
    pub fn get_assessment(&self, assessment_id: &Uuid) -> Option<AssessmentModel> {
        self.assessments.borrow().get(assessment_id).cloned()
    }

    pub fn cache_assessment(&self, assessment_id: Uuid, assessment: AssessmentModel) {
        self.assessments.borrow_mut().insert(assessment_id, assessment);
    }

    // Submission caching methods
    pub fn get_submission(&self, assessment_id: &Uuid) -> Option<Option<SubmissionModel>> {
        self.submissions.borrow().get(assessment_id).cloned()
    }

    pub fn cache_submission(&self, assessment_id: Uuid, submission: Option<SubmissionModel>) {
        self.submissions.borrow_mut().insert(assessment_id, submission);
    }

    // File caching methods
    pub fn get_file(&self, file_id: &Uuid) -> Option<FileModel> {
        self.files.borrow().get(file_id).cloned()
    }

    pub fn cache_file(&self, file_id: Uuid, file: FileModel) {
        self.files.borrow_mut().insert(file_id, file);
    }

    // Response files caching methods
    pub fn get_response_files(&self, response_id: &Uuid) -> Option<Vec<FileModel>> {
        self.response_files.borrow().get(response_id).cloned()
    }

    pub fn cache_response_files(&self, response_id: Uuid, files: Vec<FileModel>) {
        self.response_files.borrow_mut().insert(response_id, files);
    }

    // Assessment responses caching methods
    pub fn get_assessment_responses(&self, assessment_id: &Uuid) -> Option<Vec<crate::common::database::entity::assessments_response::Model>> {
        self.assessment_responses.borrow().get(assessment_id).cloned()
    }

    pub fn cache_assessment_responses(&self, assessment_id: Uuid, responses: Vec<crate::common::database::entity::assessments_response::Model>) {
        self.assessment_responses.borrow_mut().insert(assessment_id, responses);
    }

    // Temp submission caching methods
    pub fn get_temp_submission(&self, assessment_id: &Uuid) -> Option<Option<crate::common::database::entity::temp_submission::Model>> {
        self.temp_submissions.borrow().get(assessment_id).cloned()
    }

    pub fn cache_temp_submission(&self, assessment_id: Uuid, temp_submission: Option<crate::common::database::entity::temp_submission::Model>) {
        self.temp_submissions.borrow_mut().insert(assessment_id, temp_submission);
    }

    /// Clear all cached data (useful for testing or manual cache invalidation)
    pub fn clear(&self) {
        self.assessments.borrow_mut().clear();
        self.submissions.borrow_mut().clear();
        self.files.borrow_mut().clear();
        self.response_files.borrow_mut().clear();
        self.assessment_responses.borrow_mut().clear();
        self.temp_submissions.borrow_mut().clear();
    }
}

// Task-local storage for the request cache
task_local! {
    pub static REQUEST_CACHE: RequestCache;
}

/// User-specific session cache that persists across requests for a single user
#[derive(Default, Clone)]
pub struct UserSessionCache {
    /// Cache for user's assessments by org_id
    user_assessments: HashMap<String, Vec<AssessmentModel>>,
    /// Cache for user's organization data
    user_organizations: HashMap<String, String>, // org_name -> org_id mapping
    /// Cache for user's submission statuses by assessment_id
    user_submissions: HashMap<Uuid, Option<SubmissionModel>>,
    /// Cache for user's temp submissions by assessment_id
    user_temp_submissions: HashMap<Uuid, Option<crate::common::database::entity::temp_submission::Model>>,
    /// Cache expiration timestamp (based on JWT expiration)
    expires_at: u64,
    /// Last access timestamp for cleanup purposes
    last_accessed: u64,
}

impl UserSessionCache {
    pub fn new(expires_at: u64) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        
        Self {
            user_assessments: HashMap::new(),
            user_organizations: HashMap::new(),
            user_submissions: HashMap::new(),
            user_temp_submissions: HashMap::new(),
            expires_at,
            last_accessed: now,
        }
    }

    /// Check if the cache has expired
    pub fn is_expired(&self) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        now >= self.expires_at
    }

    /// Update last accessed timestamp
    pub fn touch(&mut self) {
        self.last_accessed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// Get cached assessments for an organization
    pub fn get_user_assessments(&mut self, org_id: &str) -> Option<Vec<AssessmentModel>> {
        self.touch();
        self.user_assessments.get(org_id).cloned()
    }

    /// Cache user assessments for an organization
    pub fn cache_user_assessments(&mut self, org_id: String, assessments: Vec<AssessmentModel>) {
        self.touch();
        self.user_assessments.insert(org_id, assessments);
    }

    /// Get cached organization ID by name
    pub fn get_org_id_by_name(&mut self, org_name: &str) -> Option<String> {
        self.touch();
        self.user_organizations.get(org_name).cloned()
    }

    /// Cache organization mapping
    pub fn cache_organization(&mut self, org_name: String, org_id: String) {
        self.touch();
        self.user_organizations.insert(org_name, org_id);
    }

    /// Get cached submission status
    pub fn get_user_submission(&mut self, assessment_id: &Uuid) -> Option<Option<SubmissionModel>> {
        self.touch();
        self.user_submissions.get(assessment_id).cloned()
    }

    /// Cache submission status
    pub fn cache_user_submission(&mut self, assessment_id: Uuid, submission: Option<SubmissionModel>) {
        self.touch();
        self.user_submissions.insert(assessment_id, submission);
    }

    /// Get cached temp submission
    pub fn get_user_temp_submission(&mut self, assessment_id: &Uuid) -> Option<Option<crate::common::database::entity::temp_submission::Model>> {
        self.touch();
        self.user_temp_submissions.get(assessment_id).cloned()
    }

    /// Cache temp submission
    pub fn cache_user_temp_submission(&mut self, assessment_id: Uuid, temp_submission: Option<crate::common::database::entity::temp_submission::Model>) {
        self.touch();
        self.user_temp_submissions.insert(assessment_id, temp_submission);
    }

    /// Clear all cached data for this user
    pub fn clear(&mut self) {
        self.user_assessments.clear();
        self.user_organizations.clear();
        self.user_submissions.clear();
        self.user_temp_submissions.clear();
        self.touch();
    }

    /// Invalidate specific assessment-related caches
    pub fn invalidate_assessment(&mut self, assessment_id: &Uuid) {
        self.user_submissions.remove(assessment_id);
        self.user_temp_submissions.remove(assessment_id);
        // Clear all user assessments as they might be affected
        self.user_assessments.clear();
        self.touch();
    }
}

/// Global session cache manager
#[derive(Default)]
pub struct SessionCache {
    /// Cache storage: user_id -> UserSessionCache
    users: Arc<RwLock<HashMap<String, UserSessionCache>>>,
}

impl SessionCache {
    pub fn new() -> Self {
        Self::default()
    }

    /// Get or create a user session cache
    pub fn get_user_cache(&self, user_id: &str, jwt_exp: u64) -> Option<UserSessionCache> {
        // Try to read first
        if let Ok(users) = self.users.read() {
            if let Some(cache) = users.get(user_id) {
                if !cache.is_expired() {
                    return Some(cache.clone());
                }
            }
        }

        // Create new cache if not found or expired
        let new_cache = UserSessionCache::new(jwt_exp);
        if let Ok(mut users) = self.users.write() {
            users.insert(user_id.to_string(), new_cache.clone());
            Some(new_cache)
        } else {
            None
        }
    }

    /// Update user session cache
    pub fn update_user_cache(&self, user_id: &str, cache: UserSessionCache) {
        if let Ok(mut users) = self.users.write() {
            users.insert(user_id.to_string(), cache);
        }
    }

    /// Remove expired caches and perform cleanup
    pub fn cleanup_expired(&self) {
        if let Ok(mut users) = self.users.write() {
            users.retain(|_, cache| !cache.is_expired());
        }
    }

    /// Invalidate a specific user's cache
    pub fn invalidate_user(&self, user_id: &str) {
        if let Ok(mut users) = self.users.write() {
            users.remove(user_id);
        }
    }

    /// Clear all caches (useful for testing)
    pub fn clear_all(&self) {
        if let Ok(mut users) = self.users.write() {
            users.clear();
        }
    }
}

impl Clone for SessionCache {
    fn clone(&self) -> Self {
        Self {
            users: Arc::clone(&self.users),
        }
    }
}

/// Cached wrapper functions for common database operations
pub mod cached_ops {
    use super::*;
    use crate::web::routes::AppState;
    use crate::web::api::error::ApiError;
    use crate::common::models::claims::Claims;

    /// Get assessment by ID with caching
    pub async fn get_assessment_by_id(
        app_state: &AppState,
        assessment_id: Uuid,
    ) -> Result<Option<AssessmentModel>, ApiError> {
        // Check cache first
        if let Ok(cached) = REQUEST_CACHE.try_with(|cache| cache.get_assessment(&assessment_id)) {
            if cached.is_some() {
                return Ok(cached);
            }
        }

        // Fetch from database
        let assessment = app_state
            .database
            .assessments
            .get_assessment_by_id(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessment: {e}")))?;

        // Cache the result if found and cache is available
        if let Some(ref assessment_model) = assessment {
            let _ = REQUEST_CACHE.try_with(|cache| {
                cache.cache_assessment(assessment_id, assessment_model.clone());
            });
        }

        Ok(assessment)
    }

    /// Get submission by assessment ID with caching
    pub async fn get_submission_by_assessment_id(
        app_state: &AppState,
        assessment_id: Uuid,
    ) -> Result<Option<SubmissionModel>, ApiError> {
        // Check cache first
        if let Ok(cached) = REQUEST_CACHE.try_with(|cache| cache.get_submission(&assessment_id)) {
            if let Some(submission) = cached {
                return Ok(submission);
            }
        }

        // Fetch from database
        let submission = app_state
            .database
            .assessments_submission
            .get_submission_by_assessment_id(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to check submission status: {e}")))?;

        // Cache the result if cache is available
        let _ = REQUEST_CACHE.try_with(|cache| {
            cache.cache_submission(assessment_id, submission.clone());
        });

        Ok(submission)
    }

    /// Get files for response with caching
    pub async fn get_files_for_response(
        app_state: &AppState,
        response_id: Uuid,
    ) -> Result<Vec<FileModel>, ApiError> {
        // Check cache first
        if let Ok(cached) = REQUEST_CACHE.try_with(|cache| cache.get_response_files(&response_id)) {
            if let Some(files) = cached {
                return Ok(files);
            }
        }

        // Fetch from database
        let files = app_state
            .database
            .assessments_response_file
            .get_files_for_response(response_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch files for response: {e}")))?;

        // Cache the result if cache is available
        let _ = REQUEST_CACHE.try_with(|cache| {
            cache.cache_response_files(response_id, files.clone());
        });

        Ok(files)
    }

    /// Get latest responses by assessment with caching
    pub async fn get_latest_responses_by_assessment(
        app_state: &AppState,
        assessment_id: Uuid,
    ) -> Result<Vec<crate::common::database::entity::assessments_response::Model>, ApiError> {
        // Check cache first
        if let Ok(cached) = REQUEST_CACHE.try_with(|cache| cache.get_assessment_responses(&assessment_id)) {
            if let Some(responses) = cached {
                return Ok(responses);
            }
        }

        // Fetch from database
        let responses = app_state
            .database
            .assessments_response
            .get_latest_responses_by_assessment(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch responses: {e}")))?;

        // Cache the result if cache is available
        let _ = REQUEST_CACHE.try_with(|cache| {
            cache.cache_assessment_responses(assessment_id, responses.clone());
        });

        Ok(responses)
    }

    /// Get temp submission by assessment ID with caching
    pub async fn get_temp_submission_by_assessment_id(
        app_state: &AppState,
        assessment_id: Uuid,
    ) -> Result<Option<crate::common::database::entity::temp_submission::Model>, ApiError> {
        // Check cache first
        if let Ok(cached) = REQUEST_CACHE.try_with(|cache| cache.get_temp_submission(&assessment_id)) {
            if let Some(temp_submission) = cached {
                return Ok(temp_submission);
            }
        }

        // Fetch from database
        let temp_submission = app_state
            .database
            .temp_submission
            .get_temp_submission_by_assessment_id(assessment_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to query temp submission: {e}")))?;

        // Cache the result if cache is available
        let _ = REQUEST_CACHE.try_with(|cache| {
            cache.cache_temp_submission(assessment_id, temp_submission.clone());
        });

        Ok(temp_submission)
    }

    /// Session-aware cached operations that utilize both session and request level caching
    
    /// Get user assessments with session-level caching
    pub async fn get_user_assessments_with_session(
        app_state: &AppState,
        claims: &Claims,
        org_id: &str,
    ) -> Result<Vec<AssessmentModel>, ApiError> {
        let user_id = &claims.sub;
        let jwt_exp = claims.exp;

        // Check session cache first
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            if let Some(assessments) = user_cache.get_user_assessments(org_id) {
                // Update the session cache with the touched timestamp
                app_state.session_cache.update_user_cache(user_id, user_cache);
                return Ok(assessments);
            }
        }

        // Fetch from database
        let assessments = app_state
            .database
            .assessments
            .get_assessments_by_org(org_id)
            .await
            .map_err(|e| ApiError::InternalServerError(format!("Failed to fetch assessments: {e}")))?;

        // Cache in session cache
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            user_cache.cache_user_assessments(org_id.to_string(), assessments.clone());
            app_state.session_cache.update_user_cache(user_id, user_cache);
        }

        Ok(assessments)
    }

    /// Get submission with session-level caching
    pub async fn get_submission_with_session(
        app_state: &AppState,
        claims: &Claims,
        assessment_id: Uuid,
    ) -> Result<Option<SubmissionModel>, ApiError> {
        let user_id = &claims.sub;
        let jwt_exp = claims.exp;

        // Check session cache first
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            if let Some(submission) = user_cache.get_user_submission(&assessment_id) {
                // Update the session cache with the touched timestamp
                app_state.session_cache.update_user_cache(user_id, user_cache);
                return Ok(submission);
            }
        }

        // Fall back to request-level cache and database
        let submission = get_submission_by_assessment_id(app_state, assessment_id).await?;

        // Cache in session cache
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            user_cache.cache_user_submission(assessment_id, submission.clone());
            app_state.session_cache.update_user_cache(user_id, user_cache);
        }

        Ok(submission)
    }

    /// Get temp submission with session-level caching
    pub async fn get_temp_submission_with_session(
        app_state: &AppState,
        claims: &Claims,
        assessment_id: Uuid,
    ) -> Result<Option<crate::common::database::entity::temp_submission::Model>, ApiError> {
        let user_id = &claims.sub;
        let jwt_exp = claims.exp;

        // Check session cache first
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            if let Some(temp_submission) = user_cache.get_user_temp_submission(&assessment_id) {
                // Update the session cache with the touched timestamp
                app_state.session_cache.update_user_cache(user_id, user_cache);
                return Ok(temp_submission);
            }
        }

        // Fall back to request-level cache and database
        let temp_submission = get_temp_submission_by_assessment_id(app_state, assessment_id).await?;

        // Cache in session cache
        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            user_cache.cache_user_temp_submission(assessment_id, temp_submission.clone());
            app_state.session_cache.update_user_cache(user_id, user_cache);
        }

        Ok(temp_submission)
    }

    /// Invalidate session cache for a user when data changes
    pub fn invalidate_user_session_cache(
        app_state: &AppState,
        claims: &Claims,
        assessment_id: Option<Uuid>,
    ) {
        let user_id = &claims.sub;
        let jwt_exp = claims.exp;

        if let Some(mut user_cache) = app_state.session_cache.get_user_cache(user_id, jwt_exp) {
            if let Some(assessment_id) = assessment_id {
                user_cache.invalidate_assessment(&assessment_id);
            } else {
                user_cache.clear();
            }
            app_state.session_cache.update_user_cache(user_id, user_cache);
        }
    }

    /// Cleanup expired session caches (should be called periodically)
    pub fn cleanup_expired_sessions(app_state: &AppState) {
        app_state.session_cache.cleanup_expired();
    }
}

/// Macro to run code with request-level caching enabled
#[macro_export]
macro_rules! with_request_cache {
    ($body:expr) => {
        $crate::common::cache::REQUEST_CACHE.scope(
            $crate::common::cache::RequestCache::new(),
            async move { $body }
        ).await
    };
}