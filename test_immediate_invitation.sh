#!/bin/bash

# Test Immediate Organization Invitation Flow
# This script tests the new flow where organization invitation is sent immediately

set -e

echo "🧪 Testing Immediate Organization Invitation Flow"
echo "================================================"
echo ""
echo "📋 Instructions:"
echo ""
echo "1. Start your backend and frontend:"
echo "   # Terminal 1: Start backend"
echo "   cd backend && cargo run"
echo ""
echo "   # Terminal 2: Start frontend"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Go to the frontend and create a user invitation:"
echo "   - Navigate to http://localhost:5173"
echo "   - Go to admin panel → Manage Users"
echo "   - Create a new user invitation"
echo ""
echo "3. Expected behavior:"
echo "   ✅ User is created in Keycloak"
echo "   ✅ Email verification email is sent"
echo "   ✅ Organization invitation email is sent IMMEDIATELY"
echo "   ✅ User status shows as 'Active' (not 'Pending Email Verification')"
echo ""
echo "4. Check the response:"
echo "   - The API response should show status: 'active'"
echo "   - The message should mention both emails were sent"
echo ""
echo "🎯 This is the new simplified flow:"
echo "   Admin creates invitation → Email 1 (verification) + Email 2 (organization) sent immediately"
echo ""

echo "✅ Test script ready!"
echo "   Run the steps above to test the immediate organization invitation flow."
