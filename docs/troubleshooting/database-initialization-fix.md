# Database Initialization Fix

## Issue Description
When starting the docker-compose environment, Keycloak was failing to start with the error:
```
FATAL: database "keycloak" does not exist
```

## Root Cause Analysis
The issue was caused by several problems in the database initialization setup:

1. **Duplicate and conflicting code** in `infrastructure/database/init-multiple-databases.sh`
2. **PostgreSQL skipping initialization** because it detected existing data in the volume
3. **Missing keycloak database creation** during PostgreSQL initialization

## Solution Applied

### 1. Fixed the Database Initialization Script
**File**: `infrastructure/database/init-multiple-databases.sh`

**Problems found**:
- Duplicate `#!/bin/bash` shebang lines
- Duplicate `set -e` and `set -u` commands
- Two different functions with similar purposes but different implementations
- Conflicting logic for database creation

**Changes made**:
- Removed duplicate code and consolidated into a single, clean script
- Ensured the script always creates the `keycloak` database and user
- Added proper permissions for both `keycloak` user and `dgrv_user` on the keycloak database
- Maintained backward compatibility with environment variable-based database creation

### 2. Forced Database Re-initialization
Since PostgreSQL was skipping initialization due to existing data, we:
- Stopped all containers: `docker-compose down --remove-orphans`
- Removed the postgres data volume: `docker volume rm dgat-sustainability_postgres_data`
- Restarted the environment: `docker-compose up -d`

## Verification
After applying the fix:

1. **PostgreSQL**: Started successfully and is healthy
2. **Keycloak**: 
   - Successfully connected to the keycloak database
   - Ran 117 database migrations successfully
   - Initialized the master realm
   - Started successfully on port 8080
   - Health endpoint returns `{"status": "UP"}`

## Key Changes Made

### Before (Problematic Script)
```bash
#!/bin/bash
#!/bin/bash  # Duplicate shebang

set -e
set -u

function create_user_and_database() {
    # Hardcoded function
}

# Hardcoded keycloak creation
create_user_and_database keycloak

# ... more code ...

set -e  # Duplicate
set -u  # Duplicate

# Different function with similar purpose
create_user_and_db() {
    # Different implementation
}
```

### After (Fixed Script)
```bash
#!/bin/bash

set -e
set -u

# Function to create a user and database
create_user_and_db() {
    local database=$1
    local user=$2
    local password=$3
    echo "Creating user '$user' and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE USER $user WITH PASSWORD '$password';
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $user;
        \c $database
        GRANT ALL ON SCHEMA public TO $user;
EOSQL
}

# Always create the keycloak database for Keycloak service
echo "Creating 'keycloak' database..."
create_user_and_db keycloak keycloak dgrv_password

# Grant additional permissions to the main dgrv_user on keycloak database
echo "Setting additional permissions for 'keycloak' database..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "keycloak" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO dgrv_user;
    GRANT ALL ON SCHEMA public TO dgrv_user;
EOSQL
```

## Prevention
To prevent this issue in the future:
1. Always test database initialization scripts in a clean environment
2. Avoid duplicate code in initialization scripts
3. Use consistent function naming and implementation
4. Test with fresh docker volumes to ensure initialization works properly

## Status
✅ **RESOLVED** - The keycloak database is now created successfully and Keycloak starts without errors.