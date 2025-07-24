#!/bin/bash

# This script updates the docker-compose.yml file with the EC2 instance's public IP address

# Get the EC2 public IP address
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -z "$EC2_IP" ]; then
  echo "Error: Could not detect EC2 IP address"
  exit 1
fi

echo "Detected EC2 IP: $EC2_IP"

# Update the CORS_ORIGIN in docker-compose.yml
SEARCH_STRING="CORS_ORIGIN: http://13.49.74.167"
REPLACE_STRING="CORS_ORIGIN: https://$EC2_IP"

sed -i "s|$SEARCH_STRING|$REPLACE_STRING|g" docker-compose.yml

# Update Keycloak environment variables for frontend
SEARCH_STRING="VITE_KEYCLOAK_ISSUER_URI: \"https://localhost/auth/realms/sustainability-realm\""
REPLACE_STRING="VITE_KEYCLOAK_ISSUER_URI: \"https://$EC2_IP/auth/realms/sustainability-realm\""
sed -i "s|$SEARCH_STRING|$REPLACE_STRING|g" docker-compose.yml

SEARCH_STRING="VITE_KEYCLOAK_HOME_URL: \"https://localhost/\""
REPLACE_STRING="VITE_KEYCLOAK_HOME_URL: \"https://$EC2_IP/\""
sed -i "s|$SEARCH_STRING|$REPLACE_STRING|g" docker-compose.yml

SEARCH_STRING="VITE_KEYCLOAK_REDIRECT_URI: \"https://localhost/callback\""
REPLACE_STRING="VITE_KEYCLOAK_REDIRECT_URI: \"https://$EC2_IP/callback\""
sed -i "s|$SEARCH_STRING|$REPLACE_STRING|g" docker-compose.yml

# Update Keycloak hostname
SEARCH_STRING="KC_HOSTNAME: \"localhost\""
REPLACE_STRING="KC_HOSTNAME: \"$EC2_IP\""
sed -i "s|$SEARCH_STRING|$REPLACE_STRING|g" docker-compose.yml

echo "docker-compose.yml has been updated with the EC2 IP address: $EC2_IP"
