#[macro_export]
macro_rules! impl_database_entity {
    ($entity:ty, $id_column:expr) => {
        impl DatabaseEntity for $entity {
            fn _find_by_id<T>(id: T) -> sea_orm::Select<Self>
            where
                T: Into<sea_orm::Value> + Send,
            {
                Self::find().filter($id_column.eq(id))
            }
        }
    };
}
