# Testing Guide - DGAT Sustainability Tool

This document provides comprehensive guidance on testing the DGAT Sustainability Tool backend, including unit tests, integration tests, and end-to-end testing scenarios.

## Overview

The testing strategy includes multiple layers:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions with mock services
3. **End-to-End Tests**: Test complete workflows with real Keycloak instance
4. **Performance Tests**: Verify system performance under load

## Test Structure

```
backend/
├── src/
│   └── web/
│       └── routes.rs          # Basic unit tests
├── tests/
│   ├── integration_tests.rs   # Mock-based integration tests
│   └── e2e_tests.rs           # Real Keycloak E2E tests
└── Cargo.toml
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Rust toolchain (latest stable)
- curl (for health checks)

### Running All Tests


## Test Categories

### 1. Unit Tests

**Location**: `backend/src/web/routes.rs`

**Purpose**: Test individual functions and components in isolation.

**Running**:
```bash
cd backend
cargo test --lib
```

**Coverage**:
- Health endpoint functionality
- Route configuration
- Basic authentication middleware

### 2. Integration Tests

**Location**: `backend/tests/integration_tests.rs`

**Purpose**: Test component interactions using mock services.

**Features**:
- Mock JWT token generation
- Simulated authentication flows
- Role-based access control testing
- Error handling scenarios

**Running**:
```bash
cd backend
cargo test integration_tests
```

### 3. End-to-End Tests

**Location**: `backend/tests/e2e_tests.rs`

**Purpose**: Test complete workflows with real Keycloak instance.

**Features**:
- Real JWT token generation from Keycloak
- Complete authentication flows
- Organization and user management workflows
- Role-based access control with real tokens
- Automatic test realm creation and cleanup

**Running**:
```bash
cd backend
cargo test e2e_tests
```

## End-to-End Test Scenarios

### Test 1: Application Admin Workflow

**Scenario**: Complete application admin workflow

**Steps**:
1. Create test realm and roles in Keycloak
2. Create application admin user with `application_admin` role
3. Get JWT token for application admin
4. Test organization listing (should succeed)
5. Test organization creation (should succeed or get server error)
6. Cleanup test realm

**Expected Results**:
- Application admin can access all organization endpoints
- Proper JWT validation and role checking

### Test 2: Organization Admin Access Control

**Scenario**: Verify organization admin permissions

**Steps**:
1. Create organization admin user with `organization_admin` role
2. Get JWT token for organization admin
3. Attempt to create organization (should be forbidden)
4. Test other restricted endpoints

**Expected Results**:
- Organization admin cannot perform application admin actions
- Proper 403 Forbidden responses for unauthorized actions

### Test 3: Authentication Flow

**Scenario**: Test various authentication scenarios

**Steps**:
1. Test endpoints without authentication (should return 401)
2. Test endpoints with invalid JWT token (should return 401)
3. Test health endpoint (should work without authentication)

**Expected Results**:
- Proper authentication enforcement
- Health endpoint accessible without auth

### Test 4: Role-Based Access Control (RBAC)

**Scenario**: Comprehensive RBAC testing

**Steps**:
1. Create users with different roles:
   - Application admin
   - Organization admin
   - Regular user (no special roles)
2. Test access to admin endpoints for each user type
3. Verify proper authorization responses

**Expected Results**:
- Application admin: Access granted (or server error)
- Organization admin: 403 Forbidden for admin endpoints
- Regular user: 403 Forbidden for admin endpoints

## Test Configuration

### Environment Variables

The tests use the following environment variables:

```bash
# Keycloak Configuration
KEYCLOAK_URL=http://localhost:8080          # Keycloak instance URL
KEYCLOAK_REALM=master                       # Default realm for admin operations
TEST_ADMIN_USERNAME=admin                   # Keycloak admin username
TEST_ADMIN_PASSWORD=admin123                # Keycloak admin password

# Logging
RUST_LOG=info                               # Log level for tests
```

### Test Realm Management

E2E tests automatically:
1. Create unique test realms for each test run
2. Set up required roles (`application_admin`, `organization_admin`)
3. Create test clients with proper configuration
4. Create test users with appropriate roles
5. Clean up test realms after test completion

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      keycloak:
        image: quay.io/keycloak/keycloak:24.0
        env:
          KEYCLOAK_ADMIN: admin
          KEYCLOAK_ADMIN_PASSWORD: admin123
          KC_HTTP_ENABLED: true
        options: >-
          --health-cmd "curl -f http://localhost:8080/health/ready || exit 1"
          --health-interval 30s
          --health-timeout 10s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable

    - name: Run Tests
      run: |
        chmod +x scripts/run-integration-tests.sh
        ./scripts/run-integration-tests.sh --all --no-start
      env:
        KEYCLOAK_URL: http://localhost:8080
```

## Manual Testing

### Prerequisites Setup

1. **Start the environment**:
   ```bash
   docker-compose up -d
   ```

2. **Wait for Keycloak to be ready**:
   ```bash
   curl http://localhost:8080/health/ready
   ```

3. **Verify services are running**:
   ```bash
   docker-compose ps
   ```

### Manual Test Scenarios

#### Scenario 1: Get Admin Token

```bash
# Get admin token from Keycloak
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=admin-cli&username=admin&password=admin123&grant_type=password' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

#### Scenario 2: Test Health Endpoint

```bash
# Test health endpoint (no auth required)
curl -X GET http://localhost:3001/health
```

#### Scenario 3: Test Protected Endpoint

```bash
# Test protected endpoint without auth (should return 401)
curl -X GET http://localhost:3001/api/v1/organizations

# Test protected endpoint with token (requires running backend)
curl -X GET http://localhost:3001/api/v1/organizations \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Common Issues

#### 1. Keycloak Not Ready

**Error**: `Keycloak is not available at http://localhost:8080`

**Solution**:
```bash
# Check Keycloak status
docker-compose logs keycloak

# Wait for Keycloak to be ready
curl http://localhost:8080/health/ready

# Restart if needed
docker-compose restart keycloak
```

#### 2. Test Realm Creation Fails

**Error**: `Failed to create realm: 401`

**Solution**:
- Verify admin credentials are correct
- Check Keycloak admin console access
- Ensure Keycloak is fully initialized

#### 3. JWT Token Validation Fails

**Error**: `Token validation failed`

**Solution**:
- Verify token is not expired
- Check realm configuration
- Ensure public keys are accessible

#### 4. Port Conflicts

**Error**: `Port 8080 already in use`

**Solution**:
```bash
# Check what's using the port
lsof -i :8080

# Stop conflicting services
docker-compose down

# Use different port if needed
export KEYCLOAK_URL=http://localhost:8081
```

### Debug Mode

Enable debug logging for more detailed output:

```bash
export RUST_LOG=debug
```


### Benchmark Tests

```bash
# Run benchmark tests
cd backend
cargo test performance_tests --release -- --nocapture
```

## Test Data Management

### Test Data Cleanup

E2E tests automatically clean up test data, but you can manually clean up if needed:

```bash
# List test realms
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/realms | jq '.[] | select(.realm | startswith("test-realm"))'

# Delete specific test realm
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/realms/test-realm-12345678
```

### Test Data Fixtures

Test utilities provide helper functions for creating test data:

```
// Create test organization
let org_request = test_utils::create_test_organization_request();

// Create test user  
let user_request = test_utils::create_test_user_request(&org_id);

// Create test claims
let claims = test_utils::create_application_admin_claims();
```

## Best Practices

### Test Organization

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after test completion
3. **Deterministic**: Tests should produce consistent results
4. **Fast**: Unit tests should run quickly, integration tests can be slower

### Test Data

1. **Unique Names**: Use UUIDs or timestamps for unique test data
2. **Minimal Data**: Create only the data needed for the specific test
3. **Realistic Data**: Use realistic but safe test data
4. **No Secrets**: Never use real credentials or sensitive data in tests

### Error Handling

1. **Expected Errors**: Test both success and failure scenarios
2. **Error Messages**: Verify error messages are helpful and secure
3. **Status Codes**: Check HTTP status codes are correct
4. **Graceful Degradation**: Test system behavior when dependencies fail


### Test Coverage

```bash
# Install cargo-tarpaulin for coverage
cargo install cargo-tarpaulin

# Generate coverage report
cd backend
cargo tarpaulin --out Html --output-dir coverage
```

## Conclusion

This testing strategy ensures the DGAT Sustainability Tool backend is reliable, secure, and maintainable. The combination of unit tests, integration tests, and end-to-end tests provides comprehensive coverage of the authentication and authorization system.

For questions or issues with testing, refer to the troubleshooting section or check the project's issue tracker.
