import { dbService, Task } from "./indexedDB";
import { addToSyncQueue } from "./syncService";

// Task management (Action Plan)
export const createTask = async (
  taskData: Omit<Task, "taskId" | "createdAt">,
): Promise<Task> => {
  const taskId = `task_${Date.now()}`;
  const task: Task = {
    ...taskData,
    taskId,
    createdAt: new Date().toISOString(),
  };
  await dbService.add("tasks", task);

  await addToSyncQueue("create_task", task, "current_user");

  return task;
};

export const updateTask = async (task: Task): Promise<void> => {
  await dbService.update("tasks", task);
  await addToSyncQueue("update_task", task, "current_user");
};

export const getTasksByAssessment = async (
  assessmentId: string,
): Promise<Task[]> => {
  return await dbService.getByIndex<Task>(
    "tasks",
    "assessmentId",
    assessmentId,
  );
};
