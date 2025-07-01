export interface Task {
  taskId: string;
  assessmentId: string;
  userId: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const getTasksByAssessment = async (
  assessmentId: string,
): Promise<Task[]> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tasks?assessmentId=${assessmentId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};

export const getTasksByUser = async (userId: string): Promise<Task[]> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tasks?userId=${userId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
};

export const createTask = async (
  task: Omit<Task, "taskId" | "createdAt" | "updatedAt">,
): Promise<Task> => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
};

export const updateTask = async (task: Task): Promise<Task> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/tasks/${task.taskId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    },
  );
  if (!response.ok) throw new Error("Failed to update task");
  return response.json();
};
