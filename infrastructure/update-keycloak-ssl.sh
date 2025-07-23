#!/bin/bash

echo "Waiting for Keycloak to be up and running..."
sleep 30

echo "Running SQL command to set ssl_required to NONE for master realm..."
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h db -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-sustainability}" -c "update REALM set ssl_required='NONE' where id = 'sustainability-realm';"

echo "SSL requirement updated successfully."
