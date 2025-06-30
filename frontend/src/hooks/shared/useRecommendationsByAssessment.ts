import { useQuery } from "@tanstack/react-query";
import { getRecommendationsByAssessment } from "../../services/user/assessmentService";

export const useRecommendationsByAssessment = (assessmentId) =>
  useQuery({
    queryKey: ["recommendations", assessmentId],
    queryFn: () => getRecommendationsByAssessment(assessmentId),
    enabled: !!assessmentId,
  });
