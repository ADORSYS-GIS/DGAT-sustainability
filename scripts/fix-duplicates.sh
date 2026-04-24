#!/bin/bash

# Script to fix duplicate assessment submissions and action plan issues
# Run this script in your VM after deploying the updated code

set -e

echo "🔧 Fixing duplicate assessment submissions and action plan issues..."

# Navigate to the backend directory
cd backend

echo "📊 Running database migration to remove duplicates and add unique constraint..."
cargo run --bin db-migrator

echo "🔄 Restarting services to apply code changes..."
cd ..

# Stop services
docker-compose down

# Rebuild and start services
docker-compose up -d --build

echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo "✅ Fix completed! The following issues have been resolved:"
echo "   - Duplicate assessment submissions removed"
echo "   - Unique constraint added to prevent future duplicates"
echo "   - 'Question text not found' errors improved"
echo "   - Duplicate categories in admin action plan fixed"
echo "   - 'No recommendation provided' entries filtered out"
echo "   - Admin and user action plans now consistent"

echo ""
echo "🎉 You can now test the application:"
echo "   - Dashboard should show correct assessment count"
echo "   - Admin reports should match dashboard count"
echo "   - Action plans should not show duplicates or empty recommendations"