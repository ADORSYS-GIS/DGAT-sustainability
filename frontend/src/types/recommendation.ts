export interface Recommendation {
  recommendationId: string;
  assessmentId: string;
  categoryId: string;
  text: { en: string };
  createdBy: string;
}

export interface StandardRecommendation {
  id: string;
  text: string;
}

export type AnyRecommendation = Recommendation | StandardRecommendation;
