import { dbService, User } from "./indexedDB";
import { addToSyncQueue } from "./syncService";

// User management
export const authenticateUser = async (
  username: string,
  password: string,
): Promise<User | null> => {
  const users = await dbService.getByIndex<User>("users", "username", username);
  const user = users.find((u) => u.password === password);
  return user || null;
};

export const createUser = async (
  userData: Omit<User, "userId">,
): Promise<User> => {
  const userId = `user_${Date.now()}`;
  const user: User = { ...userData, userId };
  await dbService.add("users", user);

  // Add to sync queue
  await addToSyncQueue("create_user", user, userId);

  return user;
};

export const updateUser = async (user: User): Promise<void> => {
  await dbService.update("users", user);
  await addToSyncQueue("update_user", user, user.userId);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await dbService.delete("users", userId);
  await addToSyncQueue("delete_user", { userId }, userId);
};

export const getAllUsers = async (): Promise<User[]> => {
  return await dbService.getAll<User>("users");
};
