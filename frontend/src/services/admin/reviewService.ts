import { Assessment } from "@/services/user/assessmentService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getAssessmentsForReview = async (): Promise<Assessment[]> => {
  const response = await fetch(
    `${API_BASE_URL}/assessments?status=submitted&status=under_review`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch assessments for review");
  }
  return response.json();
};

export const updateAssessmentStatus = async (
  assessmentId: string,
  status: "completed",
): Promise<Assessment> => {
  const response = await fetch(
    `${API_BASE_URL}/assessments/${assessmentId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update assessment status");
  }
  return response.json();
};

export interface Recommendation {
  recommendationId: string;
  assessmentId: string;
  categoryId: string;
  questionId?: string;
  text: { [key: string]: string };
  type: "custom" | "standard";
  createdBy: string;
}

interface AddRecommendationPayload {
  assessmentId: string;
  categoryId: string;
  text: { en: string };
  createdBy: string;
}

export const addRecommendation = async (
  recommendationData: AddRecommendationPayload,
): Promise<Recommendation> => {
  const response = await fetch(`${API_BASE_URL}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assessmentId: recommendationData.assessmentId,
      categoryId: recommendationData.categoryId,
      text: recommendationData.text,
      type: "custom",
      createdBy: recommendationData.createdBy,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to add recommendation");
  }
  return response.json();
};

// =================================================================
// Standard Recommendations
// =================================================================

export const getStandardRecommendations = async (): Promise<
  Recommendation[]
> => {
  const response = await fetch(`${API_BASE_URL}/recommendations?type=standard`);
  if (!response.ok) {
    throw new Error("Failed to fetch standard recommendations");
  }
  return response.json();
};

export const createStandardRecommendation = async (text: {
  en: string;
}): Promise<Recommendation> => {
  const response = await fetch(`${API_BASE_URL}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      type: "standard",
      createdBy: "admin",
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to create standard recommendation");
  }
  return response.json();
};

export const updateStandardRecommendation = async ({
  recommendationId,
  text,
}: {
  recommendationId: string;
  text: { en: string };
}): Promise<Recommendation> => {
  const response = await fetch(
    `${API_BASE_URL}/recommendations/${recommendationId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update standard recommendation");
  }
  return response.json();
};

export const deleteStandardRecommendation = async (
  recommendationId: string,
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/recommendations/${recommendationId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error("Failed to delete standard recommendation");
  }
};
