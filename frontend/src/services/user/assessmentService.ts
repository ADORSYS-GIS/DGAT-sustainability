const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Assessment {
  assessmentId: string;
  userId: string;
  organizationId: string;
  templateId: string;
  answers: Record<string, unknown>;
  status: "draft" | "submitted" | "under_review" | "completed";
  score?: number;
  categoryScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export const getAssessmentsByUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/assessments?userId=${userId}`);
  if (!response.ok) throw new Error("Failed to fetch assessments");
  return response.json();
};

export const getRecommendationsByAssessment = async (assessmentId) => {
  const response = await fetch(
    `${API_BASE_URL}/recommendations?assessmentId=${assessmentId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch recommendations");
  return response.json();
};
