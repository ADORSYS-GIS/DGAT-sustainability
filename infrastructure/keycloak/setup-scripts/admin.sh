#!/bin/bash

set -euo pipefail

# Configurable via env
REALM="sustainability-realm"
USERNAME="fernando"
PASSWORD="${FERNANDO_PASSWORD}"
KC_ADMIN_USER="${KEYCLOAK_ADMIN}"
KC_ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD}"
KC_URL= "${KC_URL}"
KC_AUTH_PATH="/keycloak"

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
sleep 30

# Check if required environment variables are set
if [[ -z "$PASSWORD" ]]; then
  echo "Error: FERNANDO_PASSWORD environment variable is not set."
  exit 1
fi

echo "Starting user creation process for $USERNAME in realm $REALM"

# Login
echo "Authenticating with Keycloak admin CLI..."
kcadm.sh config credentials --server "$KC_URL$KC_AUTH_PATH" --realm master --user "$KC_ADMIN_USER" --password "$KC_ADMIN_PASS"

# Create user if doesn't exist
echo "Checking if user $USERNAME exists..."
if ! kcadm.sh get users -r "$REALM" -q username="$USERNAME" --fields id | grep -q '"id"'; then
  echo "Creating user $USERNAME..."
  kcadm.sh create users -r "$REALM" -s username="$USERNAME" -s enabled=true -s email="${USERNAME}@local" -s emailVerified=true
else
  echo "User $USERNAME already exists."
fi

echo "Getting user ID for $USERNAME..."
USER_ID=$(kcadm.sh get users -r "$REALM" -q username="$USERNAME" --fields id | grep '"id"' | head -n1 | awk -F '"' '{print $4}')

# Set temporary password
echo "Setting temporary password for $USERNAME..."
kcadm.sh set-password -r "$REALM" --userid "$USER_ID" --new-password "$PASSWORD" --temporary

# Assign all realm roles
echo "Assigning all realm roles to $USERNAME..."
REALM_ROLES=$(kcadm.sh get roles -r "$REALM" | jq -c '.[] | {id, name, description}')
if [[ -n "$REALM_ROLES" ]]; then
  for ROLE in $(echo "$REALM_ROLES" | jq -r '.name'); do
    echo "Assigning realm role: $ROLE"
    kcadm.sh add-roles -r "$REALM" --uid "$USER_ID" --rolename "$ROLE"
  done
fi

# Assign all client roles for all clients
echo "Assigning all client roles to $USERNAME..."
CLIENTS=$(kcadm.sh get clients -r "$REALM")
for CID in $(echo "$CLIENTS" | jq -r '.[].id'); do
  CLIENT_ID=$(echo "$CLIENTS" | jq -r ".[] | select(.id==\"$CID\") | .clientId")
  echo "Processing client: $CLIENT_ID"
  ROLES=$(kcadm.sh get clients/"$CID"/roles -r "$REALM")
  if [[ $(echo "$ROLES" | jq length) -gt 0 ]]; then
    for ROLE in $(echo "$ROLES" | jq -r '.[].name'); do
      echo "Assigning client role: $ROLE for client: $CLIENT_ID"
      kcadm.sh add-roles -r "$REALM" --uid "$USER_ID" --cclientid "$CLIENT_ID" --rolename "$ROLE"
    done
  fi
done

echo "User '$USERNAME' created/updated with all realm and client roles in realm '$REALM'."
