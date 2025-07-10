#!/bin/bash

# Integration Test Runner for DGAT Sustainability Tool
# This script sets up the environment and runs comprehensive integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="http://localhost:8080"
KEYCLOAK_HEALTH_ENDPOINT="$KEYCLOAK_URL/health/ready"
MAX_WAIT_TIME=120  # Maximum time to wait for Keycloak (seconds)
POLL_INTERVAL=5    # How often to check Keycloak status (seconds)

echo -e "${BLUE}🚀 DGAT Sustainability Tool - Integration Test Runner${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Keycloak is ready
check_keycloak_health() {
    curl -s -f "$KEYCLOAK_HEALTH_ENDPOINT" > /dev/null 2>&1
}

# Function to wait for Keycloak to be ready
wait_for_keycloak() {
    print_status "Waiting for Keycloak to be ready at $KEYCLOAK_URL..."

    local elapsed=0
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        if check_keycloak_health; then
            print_success "Keycloak is ready!"
            return 0
        fi

        echo -n "."
        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
    done

    print_error "Keycloak did not become ready within $MAX_WAIT_TIME seconds"
    return 1
}
#!/bin/bash
set -e

echo "===== DGAT Sustainability Tool Integration Test Runner ====="

# Default values
ALL_TESTS=false
NO_START=false
CLEANUP=true
SPECIFIC_TEST=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      ALL_TESTS=true
      shift
      ;;
    --no-start)
      NO_START=true
      shift
      ;;
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --test)
      SPECIFIC_TEST="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--all] [--no-start] [--no-cleanup] [--test TEST_NAME]"
      exit 1
      ;;
  esac
done

# Function to check if Keycloak is ready
wait_for_keycloak() {
  echo "Waiting for Keycloak to be ready..."
  max_attempts=30
  attempt=1

  while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8080/health/ready > /dev/null || \
       curl -s http://localhost:8080/realms/master > /dev/null; then
      echo "✅ Keycloak is ready!"
      return 0
    fi

    echo "Attempt $attempt/$max_attempts - Keycloak not ready yet..."
    sleep 5
    attempt=$((attempt + 1))
  done

  echo "❌ Keycloak failed to become ready after $(($max_attempts * 5)) seconds"
  return 1
}

# Function to run tests
run_tests() {
  test_type=$1
  echo "Running $test_type tests..."

  if [ "$test_type" = "unit" ]; then
    cargo test --lib
  elif [ "$test_type" = "integration" ]; then
    cargo test integration_tests --features integration-tests
  elif [ "$test_type" = "e2e" ]; then
    cargo test e2e_tests --features integration-tests
  elif [ "$test_type" = "specific" ]; then
    cargo test "$SPECIFIC_TEST" --features integration-tests
  else
    cargo test --features integration-tests
  fi

  result=$?
  if [ $result -ne 0 ]; then
    echo "❌ $test_type tests failed"
    return 1
  else
    echo "✅ $test_type tests passed"
    return 0
  fi
}

# Start containers if needed
if [ "$NO_START" = "false" ]; then
  echo "Starting test environment..."
  docker-compose down
  docker-compose up -d

  # Wait for Keycloak to be ready
  wait_for_keycloak || exit 1
fi

# Change to backend directory
cd "$(dirname "$0")/../backend" || exit 1

# Run the tests
if [ "$ALL_TESTS" = "true" ]; then
  run_tests "all"
  test_result=$?
elif [ -n "$SPECIFIC_TEST" ]; then
  run_tests "specific"
  test_result=$?
else
  # Default to running e2e tests
  run_tests "e2e"
  test_result=$?
fi

# Cleanup if requested
if [ "$CLEANUP" = "true" ] && [ "$NO_START" = "false" ]; then
  echo "Cleaning up test environment..."
  cd ..
  docker-compose down
fi

exit $test_result
# Function to start docker-compose if not running
start_docker_compose() {
    print_status "Checking if docker-compose services are running..."

    if ! docker-compose ps | grep -q "sustainability-keycloak.*Up"; then
        print_status "Starting docker-compose services..."
        docker-compose up -d

        if [ $? -ne 0 ]; then
            print_error "Failed to start docker-compose services"
            exit 1
        fi

        print_success "Docker-compose services started"
    else
        print_success "Docker-compose services are already running"
    fi
}

# Function to run the integration tests
run_integration_tests() {
    print_status "Running integration tests..."

    cd backend

    # Set environment variables for tests
    export KEYCLOAK_URL="$KEYCLOAK_URL"
    export KEYCLOAK_REALM="master"
    export TEST_ADMIN_USERNAME="admin"
    export TEST_ADMIN_PASSWORD="admin123"
    export RUST_LOG="info"

    # Run the tests
    if cargo test e2e_tests --release -- --nocapture; then
        print_success "All integration tests passed!"
        return 0
    else
        print_error "Some integration tests failed"
        return 1
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."

    cd backend

    if cargo test --lib --release; then
        print_success "All unit tests passed!"
        return 0
    else
        print_error "Some unit tests failed"
        return 1
    fi
}

# Function to clean up
cleanup() {
    print_status "Cleaning up..."
    # Add any cleanup logic here if needed
}

# Main execution
main() {
    local run_unit=false
    local run_integration=true
    local start_services=true

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit-only)
                run_unit=true
                run_integration=false
                start_services=false
                shift
                ;;
            --no-start)
                start_services=false
                shift
                ;;
            --all)
                run_unit=true
                run_integration=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --unit-only     Run only unit tests (no Keycloak required)"
                echo "  --no-start      Don't start docker-compose services"
                echo "  --all           Run both unit and integration tests"
                echo "  --help          Show this help message"
                echo ""
                echo "Default: Run integration tests with automatic service startup"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Trap cleanup on exit
    trap cleanup EXIT

    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Please run this script from the project root."
        exit 1
    fi

    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        print_error "backend directory not found. Please run this script from the project root."
        exit 1
    fi

    # Start services if requested
    if [ "$start_services" = true ]; then
        start_docker_compose
        wait_for_keycloak
    fi

    # Run tests
    local test_results=0

    if [ "$run_unit" = true ]; then
        if ! run_unit_tests; then
            test_results=1
        fi
    fi

    if [ "$run_integration" = true ]; then
        if [ "$start_services" = false ]; then
            print_warning "Integration tests require Keycloak. Make sure it's running at $KEYCLOAK_URL"
            if ! check_keycloak_health; then
                print_error "Keycloak is not available at $KEYCLOAK_URL"
                exit 1
            fi
        fi

        if ! run_integration_tests; then
            test_results=1
        fi
    fi

    # Final results
    echo ""
    echo "=================================================="
    if [ $test_results -eq 0 ]; then
        print_success "🎉 All tests completed successfully!"
    else
        print_error "❌ Some tests failed. Check the output above for details."
    fi

    exit $test_results
}

# Run main function with all arguments
main "$@"
