#!/bin/bash

# ==== CONFIGURATION ====
export KEYCLOAK_BIN_DIR=/opt/keycloak/bin
export KEYCLOAK_SERVER=${KEYCLOAK_SERVER}/keycloak
export TRUSTSTORE=/opt/keycloak/bin/truststore.jks
export REALM=sustainability-realm
export ADMIN_USER=admin
export ADMIN_PASS=admin123
export TRUSTSTORE_PASS=changeit
export NEW_USER_EMAIL=360@dgrv.coop
export TEMP_PASSWORD=dgrv@coop360
export NEW_USER_FIRSTNAME=dgrv
export NEW_USER_LASTNAME=admin

echo "[a.sh] Current working directory: $(pwd)"
echo "[a.sh] Changing directory to ${KEYCLOAK_BIN_DIR}"
cd "${KEYCLOAK_BIN_DIR}"
echo "[a.sh] Now in: $(pwd)"

# Run-once guard removed — provisioning runs on every startup.
# User creation is idempotent: existing user is deleted and recreated.

# Import certificate into truststore; robust handling with preference for nginx.crt file
CERT_PATH="/etc/x509/https/nginx.crt"
CERT_DIR="/etc/x509/https"

echo "[a.sh] Inspecting certificate path: ${CERT_PATH}"
if [ -e "${CERT_PATH}" ]; then
  if [ -f "${CERT_PATH}" ]; then
    echo "[a.sh] ${CERT_PATH} exists and is a file"
  elif [ -d "${CERT_PATH}" ]; then
    echo "[a.sh] ${CERT_PATH} exists and is a directory (unexpected for a cert file)"
  else
    echo "[a.sh] ${CERT_PATH} exists but is neither file nor directory"
  fi
else
  echo "[a.sh] ${CERT_PATH} does not exist"
fi

echo "[a.sh] Listing ${CERT_DIR} (if present):"
ls -la "${CERT_DIR}" 2>/dev/null || echo "[a.sh] ${CERT_DIR} not found"

# Choose certificate file
CERT_FILE=""
if [ -f "${CERT_PATH}" ]; then
  CERT_FILE="${CERT_PATH}"
elif [ -f "${CERT_DIR}/nginx.crt" ]; then
  CERT_FILE="${CERT_DIR}/nginx.crt"
elif [ -d "${CERT_DIR}" ]; then
  CERT_FILE="$(find "${CERT_DIR}" -maxdepth 1 -type f \( -name '*.crt' -o -name '*.pem' \) | head -n1 || true)"
fi

if [ -n "${CERT_FILE}" ] && [ -f "${CERT_FILE}" ]; then
  echo "[a.sh] Using certificate file: ${CERT_FILE}"
else
  echo "[a.sh] No certificate file found; will not update truststore from filesystem"
fi

# Ensure keystore directory exists
mkdir -p "$(dirname "${TRUSTSTORE}")"

import_cert() {
  local file="$1"
  echo "[a.sh] Importing certificate into truststore: ${TRUSTSTORE} (alias: keycloak-server)"
  # Remove existing alias to avoid duplicate import errors
  keytool -delete -alias keycloak-server -keystore "${TRUSTSTORE}" -storepass "${TRUSTSTORE_PASS}" >/dev/null 2>&1 || true
  keytool -importcert -noprompt -trustcacerts \
    -alias keycloak-server \
    -keystore "${TRUSTSTORE}" \
    -file "$file" \
    -storepass "${TRUSTSTORE_PASS}"
}

if [ -n "${CERT_FILE}" ] && [ -f "${CERT_FILE}" ]; then
  import_cert "${CERT_FILE}" || true
else
  echo "[a.sh] Attempting remote certificate fetch because no local cert was found at ${CERT_PATH}"
  hostport="${KEYCLOAK_SERVER#*://}"
  hostport="${hostport%%/*}"
  host="${hostport%%:*}"
  port="${hostport#*:}"
  if [ "${port}" = "${hostport}" ]; then port="443"; fi
  if command -v openssl >/dev/null 2>&1; then
    tmpcrt="/tmp/remote-server.crt"
    echo "[a.sh] Fetching certificate from ${host}:${port} via openssl"
    # Grab the first certificate in the chain
    if echo | openssl s_client -showcerts -servername "${host}" -connect "${host}:${port}" 2>/dev/null \
       | awk '/-----BEGIN CERTIFICATE-----/{flag=1} flag{print} /-----END CERTIFICATE-----/{exit}' > "${tmpcrt}" \
       && [ -s "${tmpcrt}" ]; then
      echo "[a.sh] Remote certificate saved to ${tmpcrt}"
      import_cert "${tmpcrt}" || true
    else
      echo "[a.sh] Failed to fetch certificate from ${host}:${port}; proceeding without updating truststore"
    fi
  else
    echo "[a.sh] openssl not available; proceeding without updating truststore"
  fi
fi

cd "${KEYCLOAK_BIN_DIR}"

# --- Debug truststore presence and password/alias ---
echo "[a.sh] Checking truststore path: ${TRUSTSTORE}"
if [ -f "${TRUSTSTORE}" ]; then
  echo "[a.sh] truststore exists: $(ls -l "${TRUSTSTORE}")"
  if keytool -list -keystore "${TRUSTSTORE}" -storepass "${TRUSTSTORE_PASS}" >/dev/null 2>&1; then
    echo "[a.sh] truststore password accepted"
    if keytool -list -keystore "${TRUSTSTORE}" -storepass "${TRUSTSTORE_PASS}" -alias keycloak-server >/dev/null 2>&1; then
      echo "[a.sh] alias 'keycloak-server' present in truststore"
    else
      echo "[a.sh] alias 'keycloak-server' NOT found in truststore"
    fi
  else
    echo "[a.sh] truststore password appears INVALID for file ${TRUSTSTORE}"
  fi
else
  echo "[a.sh] truststore NOT found at ${TRUSTSTORE}"
  echo "[a.sh] Listing contents of $(dirname "${TRUSTSTORE}")"
  ls -la "$(dirname "${TRUSTSTORE}")" || true
fi

# --- 1. LOG IN AS ADMIN ON MASTER REALM (retry until ready) ---
login_ok=false
for i in $(seq 1 120); do
  if ./kcadm.sh config credentials --server "http://localhost:8080/keycloak" \
        --realm master \
        --user "${ADMIN_USER}" \
        --password "${ADMIN_PASS}" \
        --truststore "${TRUSTSTORE}" \
        --trustpass "${TRUSTSTORE_PASS}"; then
    login_ok=true
    break
  fi
  sleep 2
done

if [ "$login_ok" != true ]; then
  echo "Failed to authenticate with Keycloak after multiple attempts"
  exit 1
fi

# --- 2. CREATE THE USER (idempotent — delete first if already exists) ---
echo "[a.sh] Checking if user ${NEW_USER_EMAIL} already exists..."
EXISTING_USER_ID=$(./kcadm.sh get users -r "${REALM}" \
    --server "http://localhost:8080/keycloak" \
    --truststore "${TRUSTSTORE}" \
    --trustpass "${TRUSTSTORE_PASS}" \
    -q "email=${NEW_USER_EMAIL}" 2>/dev/null | grep '"id"' | head -1 | sed 's/.*"id" : "\([^"]*\)".*/\1/')

if [ -n "${EXISTING_USER_ID}" ]; then
  echo "[a.sh] User ${NEW_USER_EMAIL} exists (id: ${EXISTING_USER_ID}), deleting before recreating..."
  ./kcadm.sh delete users/"${EXISTING_USER_ID}" -r "${REALM}" \
      --server "http://localhost:8080/keycloak" \
      --truststore "${TRUSTSTORE}" \
      --trustpass "${TRUSTSTORE_PASS}" || true
fi

./kcadm.sh create users \
    -r "${REALM}" \
    -s username="${NEW_USER_EMAIL}" \
    -s email="${NEW_USER_EMAIL}" \
    -s enabled=true \
    -s firstName="${NEW_USER_FIRSTNAME}" \
    -s lastName="${NEW_USER_LASTNAME}" \
    --server "http://localhost:8080/keycloak" \
    --truststore "${TRUSTSTORE}" \
    --trustpass "${TRUSTSTORE_PASS}"

# --- 3. SET TEMPORARY PASSWORD ---
./kcadm.sh set-password \
    -r "${REALM}" \
    --username "${NEW_USER_EMAIL}" \
    --new-password "${TEMP_PASSWORD}" \
    --temporary \
    --server "http://localhost:8080/keycloak" \
    --truststore "${TRUSTSTORE}" \
    --trustpass "${TRUSTSTORE_PASS}"


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
  --rolename view-users \
  --server "http://localhost:8080/keycloak" \
  --truststore "${TRUSTSTORE}" \
  --trustpass "${TRUSTSTORE_PASS}"

# --- 5. ASSIGN application_admin and drgv_admin realm roles ---
./kcadm.sh add-roles -r "${REALM}" --uusername "${NEW_USER_EMAIL}" --rolename application_admin --rolename drgv_admin \
  --server "http://localhost:8080/keycloak" \
  --truststore "${TRUSTSTORE}" \
  --trustpass "${TRUSTSTORE_PASS}"

echo ${KC_KC_SPI_EMAIL_DEFAULT_PASSWORD}

echo "[a.sh] Configuring realm email settings..."
./kcadm.sh update realms/"${REALM}" \
  -s 'smtpServer.host='"${KC_SPI_EMAIL_DEFAULT_HOST:-smtp.gmail.com}" \
  -s 'smtpServer.port='"${KC_SPI_EMAIL_DEFAULT_PORT:-25}" \
  -s 'smtpServer.from='"${KC_SPI_EMAIL_DEFAULT_FROM:-noreply@dgrv.coop}" \
  -s 'smtpServer.fromDisplayName='"${KC_SPI_EMAIL_DEFAULT_FROM_DISPLAY_NAME:-DGRV COOPERATION}" \
  -s 'smtpServer.user='"${KC_SPI_EMAIL_DEFAULT_USER:-yemelechristian2@gmail.com}" \
  -s 'smtpServer.password='"${KC_SPI_EMAIL_DEFAULT_PASSWORD}" \
  -s 'smtpServer.ssl='"${KC_SPI_EMAIL_DEFAULT_SSL:-false}" \
  -s 'smtpServer.starttls='"${KC_SPI_EMAIL_DEFAULT_STARTTLS:-true}" \
  -s 'smtpServer.auth='"${KC_SPI_EMAIL_DEFAULT_AUTH:-true}" \
  -s 'smtpServer.replyTo='"${KC_SPI_EMAIL_DEFAULT_FROM:-noreply@dgrv.coop}" \
  -s 'smtpServer.replyToDisplayName='"${KC_SPI_EMAIL_DEFAULT_FROM_DISPLAY_NAME:-DGRV COOPERATION}" \
  -s 'smtpServer.envelopeFrom=' \
  -s 'smtpServer.debug=false' \
  --server "http://localhost:8080/keycloak" \
  --truststore "${TRUSTSTORE}" \
  --trustpass "${TRUSTSTORE_PASS}"

echo "[a.sh] Email configuration completed successfully"
echo "[a.sh] Provisioning completed."