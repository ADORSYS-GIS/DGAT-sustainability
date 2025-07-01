use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{DatabaseConnection, DbErr, Statement};
use std::sync::Arc;

/// Migration status enum
#[derive(Debug, Clone, PartialEq)]
pub enum MigrationStatus {
    Pending,
    Running,
    Completed,
    Failed,
    RolledBack,
}

impl std::fmt::Display for MigrationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MigrationStatus::Pending => write!(f, "pending"),
            MigrationStatus::Running => write!(f, "running"),
            MigrationStatus::Completed => write!(f, "completed"),
            MigrationStatus::Failed => write!(f, "failed"),
            MigrationStatus::RolledBack => write!(f, "rolled_back"),
        }
    }
}

/// Migration record structure
#[derive(Debug, Clone)]
pub struct MigrationRecord {
    pub migration_name: String,
    pub status: MigrationStatus,
    pub applied_at: Option<String>,
    pub rolled_back_at: Option<String>,
    pub error_message: Option<String>,
}

/// Migration tracker for managing migration state
pub struct MigrationTracker {
    conn: Arc<DatabaseConnection>,
}

impl MigrationTracker {
    pub fn new(conn: Arc<DatabaseConnection>) -> Self {
        Self { conn }
    }

    /// Get a reference to the database connection
    pub fn get_connection(&self) -> &DatabaseConnection {
        &self.conn
    }

    /// Initialize the migration tracking table
    pub async fn initialize(&self) -> Result<(), DbErr> {
        let create_table_sql = r#"
            CREATE TABLE IF NOT EXISTS __migrations__ (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                applied_at TIMESTAMP WITH TIME ZONE,
                rolled_back_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            )
        "#;

        let statement = Statement::from_string(self.conn.get_database_backend(), create_table_sql);
        self.conn.execute(statement).await?;

        // Create index for faster lookups
        let create_index_sql = r#"
            CREATE INDEX IF NOT EXISTS idx_migrations_name_status 
            ON __migrations__ (migration_name, status)
        "#;

        let index_statement =
            Statement::from_string(self.conn.get_database_backend(), create_index_sql);
        self.conn.execute(index_statement).await?;

        Ok(())
    }

    /// Check if a migration has been completed
    pub async fn is_migration_completed(&self, migration_name: &str) -> Result<bool, DbErr> {
        let sql = format!(
            "SELECT status FROM __migrations__ WHERE migration_name = '{}' AND status = 'completed'",
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        let result = self.conn.query_one(statement).await?;
        Ok(result.is_some())
    }

    /// Get migration status
    pub async fn get_migration_status(
        &self,
        migration_name: &str,
    ) -> Result<Option<MigrationStatus>, DbErr> {
        let sql = format!(
            "SELECT status FROM __migrations__ WHERE migration_name = '{}'",
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        let result = self.conn.query_one(statement).await?;

        if let Some(row) = result {
            let status_str: String = row.try_get("", "status")?;
            let status = match status_str.as_str() {
                "pending" => MigrationStatus::Pending,
                "running" => MigrationStatus::Running,
                "completed" => MigrationStatus::Completed,
                "failed" => MigrationStatus::Failed,
                "rolled_back" => MigrationStatus::RolledBack,
                _ => MigrationStatus::Pending,
            };
            Ok(Some(status))
        } else {
            Ok(None)
        }
    }

    /// Record migration start
    pub async fn start_migration(&self, migration_name: &str) -> Result<(), DbErr> {
        let sql = format!(
            r#"
            INSERT INTO __migrations__ (migration_name, status, created_at, updated_at)
            VALUES ('{}', 'running', NOW(), NOW())
            ON CONFLICT (migration_name) 
            DO UPDATE SET 
                status = 'running',
                applied_at = NULL,
                rolled_back_at = NULL,
                error_message = NULL,
                updated_at = NOW()
            "#,
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        self.conn.execute(statement).await?;
        Ok(())
    }

    /// Record migration completion
    pub async fn complete_migration(&self, migration_name: &str) -> Result<(), DbErr> {
        let sql = format!(
            r#"
            UPDATE __migrations__ 
            SET status = 'completed', 
                applied_at = NOW(),
                error_message = NULL,
                updated_at = NOW()
            WHERE migration_name = '{}'
            "#,
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        self.conn.execute(statement).await?;
        Ok(())
    }

    /// Record migration failure
    pub async fn fail_migration(&self, migration_name: &str, error: &str) -> Result<(), DbErr> {
        let sql = format!(
            r#"
            UPDATE __migrations__ 
            SET status = 'failed', 
                error_message = '{}',
                updated_at = NOW()
            WHERE migration_name = '{}'
            "#,
            error.replace("'", "''"), // Escape single quotes
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        self.conn.execute(statement).await?;
        Ok(())
    }

    /// Record migration rollback
    pub async fn rollback_migration(&self, migration_name: &str) -> Result<(), DbErr> {
        let sql = format!(
            r#"
            UPDATE __migrations__ 
            SET status = 'rolled_back', 
                rolled_back_at = NOW(),
                updated_at = NOW()
            WHERE migration_name = '{}'
            "#,
            migration_name
        );

        let statement = Statement::from_string(self.conn.get_database_backend(), &sql);
        self.conn.execute(statement).await?;
        Ok(())
    }

    /// Get all migration records
    pub async fn get_all_migrations(&self) -> Result<Vec<MigrationRecord>, DbErr> {
        let sql = r#"
            SELECT migration_name, status, applied_at, rolled_back_at, error_message
            FROM __migrations__ 
            ORDER BY created_at ASC
        "#;

        let statement = Statement::from_string(self.conn.get_database_backend(), sql);
        let results = self.conn.query_all(statement).await?;

        let mut records = Vec::new();
        for row in results {
            let status_str: String = row.try_get("", "status")?;
            let status = match status_str.as_str() {
                "pending" => MigrationStatus::Pending,
                "running" => MigrationStatus::Running,
                "completed" => MigrationStatus::Completed,
                "failed" => MigrationStatus::Failed,
                "rolled_back" => MigrationStatus::RolledBack,
                _ => MigrationStatus::Pending,
            };

            records.push(MigrationRecord {
                migration_name: row.try_get("", "migration_name")?,
                status,
                applied_at: row.try_get("", "applied_at").ok(),
                rolled_back_at: row.try_get("", "rolled_back_at").ok(),
                error_message: row.try_get("", "error_message").ok(),
            });
        }

        Ok(records)
    }

    /// Check if there are any failed migrations that need rollback
    pub async fn has_failed_migrations(&self) -> Result<bool, DbErr> {
        let sql = r#"
            SELECT COUNT(*) as failed_count FROM __migrations__ 
            WHERE status IN ('failed', 'running')
        "#;

        let statement = Statement::from_string(self.conn.get_database_backend(), sql);
        let result = self.conn.query_one(statement).await?;

        if let Some(row) = result {
            let count: i64 = row.try_get("", "failed_count")?;
            Ok(count > 0)
        } else {
            Ok(false)
        }
    }
}
