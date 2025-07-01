import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasksByUser,
  getTasksByAssessment,
  createTask,
  updateTask,
  Task,
} from "@/services/user/taskService";

export const useTasksByUser = (userId: string) =>
  useQuery<Task[]>({
    queryKey: ["tasks", "user", userId],
    queryFn: () => getTasksByUser(userId),
    enabled: !!userId,
  });

export const useTasksByAssessment = (assessmentId: string) =>
  useQuery<Task[]>({
    queryKey: ["tasks", "assessment", assessmentId],
    queryFn: () => getTasksByAssessment(assessmentId),
    enabled: !!assessmentId,
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (
      _: Task,
      variables: Omit<Task, "taskId" | "createdAt" | "updatedAt">,
    ) => {
      // Invalidate both user and assessment queries if possible
      if (variables.assessmentId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", "assessment", variables.assessmentId],
        });
      }
      if (variables.userId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", "user", variables.userId],
        });
      }
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (data) => {
      if (data.assessmentId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", "assessment", data.assessmentId],
        });
      }
      if (data.userId) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", "user", data.userId],
        });
      }
    },
  });
};
