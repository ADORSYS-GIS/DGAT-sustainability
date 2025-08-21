#!/bin/bash

# Test Manual Trigger Flow for Email Verification and Organization Invitation
# This script tests the complete flow without relying on webhooks

set -e

# Configuration
BASE_URL="http://localhost:3001"
ADMIN_TOKEN=""  # You'll need to get this from your frontend or Keycloak

echo "🧪 Testing Manual Trigger Flow"
echo "=============================="

echo "📋 Instructions:"
echo ""
echo "1. First, create a user invitation via the frontend:"
echo "   - Go to http://localhost:5173"
echo "   - Navigate to admin panel"
echo "   - Create a new user invitation"
echo "   - Note down the user_id from the response"
echo ""
echo "2. Get an admin token:"
echo "   - Login to your frontend as admin"
echo "   - Open browser dev tools → Network tab"
echo "   - Make any admin request"
echo "   - Copy the Authorization header value"
echo ""
echo "3. Run this script with the user_id and token:"
echo "   ./test_manual_flow.sh USER_ID 'Bearer YOUR_TOKEN'"
echo ""
echo "4. The script will:"
echo "   - Check if email is verified"
echo "   - Trigger organization invitation if verified"
echo "   - Show the complete flow"
echo ""

if [ $# -eq 2 ]; then
    USER_ID=$1
    TOKEN=$2
    
    echo "🔍 Testing with User ID: $USER_ID"
    echo ""
    
    # Step 1: Check user invitation status
    echo "📊 Step 1: Checking user invitation status..."
    STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/user-invitations/$USER_ID/status" \
      -H "Authorization: $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "Status Response: $STATUS_RESPONSE"
    echo ""
    
    # Step 2: Check and trigger organization invitation
    echo "🔄 Step 2: Checking email verification and triggering organization invitation..."
    TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/user-invitations/$USER_ID/check-and-trigger" \
      -H "Authorization: $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "Trigger Response: $TRIGGER_RESPONSE"
    echo ""
    
    echo "✅ Manual flow test completed!"
    echo ""
    echo "📧 Check your email for the organization invitation"
    echo "📋 Check backend logs for detailed information"
    
else
    echo "❌ Usage: $0 USER_ID 'Bearer TOKEN'"
    echo ""
    echo "Example:"
    echo "  ./test_manual_flow.sh abc123 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'"
fi
