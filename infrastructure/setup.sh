#!/bin/bash

# ==== CONFIGURATION ====
KEYCLOAK_BIN_DIR="/opt/keycloak/bin"
KEYCLOAK_SERVER="https://ec2-16-171-203-85.eu-north-1.compute.amazonaws.com/keycloak"
TRUSTSTORE="${KEYCLOAK_BIN_DIR}/truststore.jks"
REALM="sustainability-realm"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
TRUSTSTORE_PASS="truststorepass" # Set appropriately!
NEW_USER_EMAIL="REPLACE_WITH_EMAIL"    # e.g. "jane.doe@example.com"
TEMP_PASSWORD="REPLACE_WITH_PASSWORD"  # e.g. "TempPassw0rd!"
NEW_USER_FIRSTNAME="Jane"
NEW_USER_LASTNAME="Doe"

cd "${KEYCLOAK_BIN_DIR}"

# --- 1. LOG IN AS ADMIN ON MASTER REALM ---
./kcadm.sh config credentials --server "${KEYCLOAK_SERVER}" \
    --realm master \
    --user "${ADMIN_USER}" \
    --password "${ADMIN_PASS}" \
    --truststore "${TRUSTSTORE}" \
    --trustpass "${TRUSTSTORE_PASS}"

# --- 2. CREATE THE USER ---
./kcadm.sh create users \
    -r "${REALM}" \
    -s username="${NEW_USER_EMAIL}" \
    -s email="${NEW_USER_EMAIL}" \
    -s enabled=true \
    -s firstName="${NEW_USER_FIRSTNAME}" \
    -s lastName="${NEW_USER_LASTNAME}"

# --- 3. SET TEMPORARY PASSWORD ---
./kcadm.sh set-password \
    -r "${REALM}" \
    --username "${NEW_USER_EMAIL}" \
    --new-password "${TEMP_PASSWORD}" \
    --temporary

# --- 4. ASSIGN REALM-MANAGEMENT ROLES (replace or add/remove as needed) ---
./kcadm.sh add-roles -r "${REALM}" --uusername "${NEW_USER_EMAIL}" --cclientid realm-management \
  --rolename create-client \
  --rolename create-organization \
  --rolename impersonation \
  --rolename manage-authorization \
  --rolename manage-clients \
  --rolename manage-events \
  --rolename manage-identity-providers \
  --rolename manage-organizations \
  --rolename manage-realm \
  --rolename manage-users \
  --rolename publish-events \
  --rolename query-clients \
  --rolename query-groups \
  --rolename query-realms \
  --rolename query-users \
  --rolename realm-admin \
  --rolename view-authorization \
  --rolename view-clients \
  --rolename view-events \
  --rolename view-identity-providers \
  --rolename view-organizations \
  --rolename view-realm \
  --rolename view-users \
  --truststore "${TRUSTSTORE}" \
  --trustpass "${TRUSTSTORE_PASS}"

# --- 5. ASSIGN application_admin and drgv_admin realm roles ---
./kcadm.sh add-roles -r "${REALM}" --uusername "${NEW_USER_EMAIL}" --rolename application_admin --rolename drgv_admin \
  --truststore "${TRUSTSTORE}" \
  --trustpass "${TRUSTSTORE_PASS}"