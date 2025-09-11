#!/bin/bash

# Test script for user invitation flow
# Make sure the backend is running on port 3001

BASE_URL="http://localhost:3001/api"
ADMIN_TOKEN="your-admin-token-here"  # Replace with actual admin token

echo "🧪 Testing User Invitation Flow"
echo "=================================="

# Step 1: Create user invitation
echo "📧 Step 1: Creating user invitation..."
INVITATION_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/user-invitations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "organization_id": "your-org-id",
    "roles": ["org_user"],
    "categories": ["environmental"]
  }')

echo "Response: $INVITATION_RESPONSE"

# Extract user_id from response
USER_ID=$(echo $INVITATION_RESPONSE | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "❌ Failed to extract user_id from response"
    exit 1
fi

echo "✅ User created with ID: $USER_ID"

# Step 2: Check user status
echo ""
echo "📊 Step 2: Checking user status..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/user-invitations/$USER_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Status: $STATUS_RESPONSE"

# Step 3: Manually trigger email verification (for testing)
echo ""
echo "📧 Step 3: Manually triggering email verification..."
VERIFICATION_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/user-invitations/$USER_ID/trigger-verification" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Verification trigger: $VERIFICATION_RESPONSE"

# Step 4: Check and trigger organization invitation (smart method)
echo ""
echo "🏢 Step 4: Checking email verification and triggering organization invitation..."
CHECK_AND_TRIGGER_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/user-invitations/$USER_ID/check-and-trigger" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Check and trigger response: $CHECK_AND_TRIGGER_RESPONSE"

# Step 5: Manually trigger organization invitation (fallback method)
echo ""
echo "🏢 Step 5: Manually triggering organization invitation (fallback)..."
ORG_INVITATION_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/user-invitations/$USER_ID/trigger-org-invitation" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Organization invitation trigger: $ORG_INVITATION_RESPONSE"

# Step 6: Check final status
echo ""
echo "📊 Step 6: Checking final status..."
FINAL_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/user-invitations/$USER_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Final status: $FINAL_STATUS_RESPONSE"

echo ""
echo "✅ Test completed!"
echo ""
echo "📝 Next steps:"
echo "1. Check Keycloak admin console for the created user"
echo "2. Check if verification email was sent"
echo "3. Check if organization invitation was created"
echo "4. Verify the user status in the response"
