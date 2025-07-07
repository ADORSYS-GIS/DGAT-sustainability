use sustainability_tool::common::database::init::initialize_database;
use sustainability_tool::common::state::AppDatabase;

#[tokio::main]
async fn main() {
    // Initialize database connection
    match initialize_database().await {
        Ok(conn) => {
            println!("Database connection established successfully");

            // Initialize the application database state
            let _app_db = AppDatabase::new(conn).await;

            // Here you would typically start your web server or other application logic
            println!("Application initialized successfully");
        }
        Err(err) => {
            eprintln!("Failed to initialize database: {err}");
            std::process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
