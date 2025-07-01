export interface Assessment {
  assessmentId: string;
  userId: string;
  organizationId: string;
  templateId: string;
  answers: Record<string, unknown>; // JSON answers
  status: "draft" | "submitted" | "under_review" | "completed";
  score?: number;
  categoryScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export const getAssessmentsByUser = async (userId) => {
  const response = await fetch(
    `http://localhost:8000/api/assessments?userId=${userId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch assessments");
  return response.json();
};

export const getRecommendationsByAssessment = async (assessmentId) => {
  const response = await fetch(
    `http://localhost:8000/api/recommendations?assessmentId=${assessmentId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch recommendations");
  return response.json();
};

export const createAssessment = async (
  assessment: Omit<Assessment, "assessmentId" | "createdAt" | "updatedAt">,
): Promise<Assessment> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/assessments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment),
    },
  );
  if (!response.ok) throw new Error("Failed to create assessment");
  return response.json();
};

export const updateAssessment = async (
  assessment: Assessment,
): Promise<Assessment> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/assessments/${assessment.assessmentId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment),
    },
  );
  if (!response.ok) throw new Error("Failed to update assessment");
  return response.json();
};
