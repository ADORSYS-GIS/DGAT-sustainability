import { useQuery } from "@tanstack/react-query";
import { getAssessmentsByUser } from "../../services/user/assessmentService";

export const useAssessmentsByUser = (userId) =>
  useQuery({
    queryKey: ["assessments", userId],
    queryFn: () => getAssessmentsByUser(userId),
    enabled: !!userId,
  });
