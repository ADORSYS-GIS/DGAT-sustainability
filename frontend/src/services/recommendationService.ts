import { dbService, Recommendation } from "./indexedDB";
import { addToSyncQueue } from "./syncService";

// Recommendation management
export const createRecommendation = async (
  recData: Omit<Recommendation, "recommendationId" | "createdAt">,
): Promise<Recommendation> => {
  const recommendationId = `rec_${Date.now()}`;
  const recommendation: Recommendation = {
    ...recData,
    recommendationId,
    createdAt: new Date().toISOString(),
  };
  await dbService.add("recommendations", recommendation);

  await addToSyncQueue(
    "create_recommendation",
    recommendation,
    recData.createdBy,
  );

  return recommendation;
};

export const updateRecommendation = async (
  recommendation: Recommendation,
): Promise<void> => {
  await dbService.update("recommendations", recommendation);
  await addToSyncQueue(
    "update_recommendation",
    recommendation,
    recommendation.createdBy,
  );
};

export const deleteRecommendation = async (
  recommendationId: string,
): Promise<void> => {
  await dbService.delete("recommendations", recommendationId);
  await addToSyncQueue("delete_recommendation", { recommendationId }, "admin");
};

export const getAllRecommendations = async (): Promise<Recommendation[]> => {
  return await dbService.getAll<Recommendation>("recommendations");
};

export const getRecommendationsByAssessment = async (
  assessmentId: string,
): Promise<Recommendation[]> => {
  return await dbService.getByIndex<Recommendation>(
    "recommendations",
    "assessmentId",
    assessmentId,
  );
};
