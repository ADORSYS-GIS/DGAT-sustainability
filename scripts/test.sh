#!/bin/bash
echo "🧪 Running DGRV Digital Tools tests..."

# Run backend tests
echo "🦀 Running Rust tests..."
cd backend && cargo test && cd ..

# Run frontend tests
echo "⚛️ Running frontend tests..."
cd frontend/user-pwa && npm test -- --coverage --watchAll=false && cd ../..
cd frontend/admin-frontend && npm test -- --coverage --watchAll=false && cd ../..

# Run integration tests
echo "🔗 Running integration tests..."
# TODO: Add integration test commands

echo "✅ All tests completed!"
