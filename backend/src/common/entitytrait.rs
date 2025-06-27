use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, DbErr, DeleteResult, EntityTrait as SeaEntityTrait,
    IntoActiveModel, PrimaryKeyTrait, Value,
};
use std::fmt::Debug;
use std::marker::PhantomData;
use std::sync::Arc;

#[async_trait]
pub trait DatabaseEntity: SeaEntityTrait + Send + Sync + Debug
where
    Self::Model: IntoActiveModel<Self::ActiveModel> + Send + Sync,
    Self::ActiveModel: ActiveModelTrait<Entity = Self> + Send + Sync,
    <Self as SeaEntityTrait>::Model: Send + Sync,
{
    fn _find_by_id<T>(id: T) -> Select<Self>
    where
        T: Into<Value> + Send;
}

pub struct DatabaseService<E>
where
    E: DatabaseEntity,
    E::Model: IntoActiveModel<E::ActiveModel> + Sync,
    E::ActiveModel: ActiveModelTrait<Entity = E> + Send + Sync,
{
    db: Arc<DatabaseConnection>,
    _phantom: PhantomData<E>,
}

impl<E> DatabaseService<E>
where
    E: DatabaseEntity,
    E::Model: IntoActiveModel<E::ActiveModel> + Sync,
    E::ActiveModel: ActiveModelTrait<Entity = E> + Send + Sync,
{
    pub fn new(db: Arc<DatabaseConnection>) -> Self
    where
        <E as sea_orm::EntityTrait>::Model: Sync,
    {
        Self {
            db,
            _phantom: PhantomData,
        }
    }

    pub async fn create(
        &self,
        model: <E as SeaEntityTrait>::ActiveModel,
    ) -> Result<<E as SeaEntityTrait>::Model, DbErr> {
        model.insert(&*self.db).await
    }

    pub async fn find_by_id<T>(&self, id: T) -> Result<Option<<E as SeaEntityTrait>::Model>, DbErr>
    where
        T: Into<<E::PrimaryKey as PrimaryKeyTrait>::ValueType> + Send,
    {
        <E as SeaEntityTrait>::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_all(&self) -> Result<Vec<<E as SeaEntityTrait>::Model>, DbErr>
    where
        <E as sea_orm::EntityTrait>::Model: Sync,
    {
        E::find().all(&*self.db).await
    }

    pub async fn update(
        &self,
        model: <E as SeaEntityTrait>::ActiveModel,
    ) -> Result<<E as SeaEntityTrait>::Model, DbErr> {
        model.update(&*self.db).await
    }

    pub async fn delete<T>(&self, id: T) -> Result<DeleteResult, DbErr>
    where
        T: Into<<E::PrimaryKey as PrimaryKeyTrait>::ValueType> + Send,
        <E as sea_orm::EntityTrait>::Model: Sync,
    {
        E::delete_by_id(id).exec(&*self.db).await
    }

    pub async fn find_many(
        &self,
        filter: Select<E>,
    ) -> Result<Vec<<E as SeaEntityTrait>::Model>, DbErr> {
        filter.all(&*self.db).await
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

// Helper type alias for Select queries
type Select<E> = sea_orm::Select<E>;
