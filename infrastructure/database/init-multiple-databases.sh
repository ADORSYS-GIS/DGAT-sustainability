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

# Check if POSTGRES_MULTIPLE_DATABASES environment variable is set
if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"

    # Split the POSTGRES_MULTIPLE_DATABASES into an array of database names
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        # Skip if the database is the same as POSTGRES_DB (already created)
        if [ "$db" != "$POSTGRES_DB" ] && [ "$db" != "keycloak" ]; then
            create_user_and_db $db $POSTGRES_USER $POSTGRES_PASSWORD
        fi
    done
    echo "Multiple databases created"
fi

# Check if POSTGRES_MULTIPLE_USERS environment variable is set
if [ -n "${POSTGRES_MULTIPLE_USERS:-}" ]; then
    echo "Multiple users creation requested: $POSTGRES_MULTIPLE_USERS"
#!/bin/bash
set -e
set -u

function create_user_and_database() {
    local database=$1
    echo "Creating user and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
        GRANT ALL PRIVILEGES ON DATABASE $database TO postgres;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi
    # Split the POSTGRES_MULTIPLE_USERS into an array of user:password pairs
    for user_pair in $(echo $POSTGRES_MULTIPLE_USERS | tr ',' ' '); do
        # Extract user and password
        user=$(echo $user_pair | cut -d':' -f1)
        password=$(echo $user_pair | cut -d':' -f2)

        # Skip if user is keycloak (already created)
        if [ "$user" != "keycloak" ]; then
            create_user_and_db $user $user $password
        fi
    done
    echo "Multiple users created"
fi

echo "PostgreSQL initialization completed"
