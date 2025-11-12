import { ReportsService } from "@/openapi-rq/requests/services.gen";

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

export type SubmitReviewPayload = {
  submission_id: string;
  recommendation: CategoryRecommendation[];
  status: "approved" | "rejected";
};

export const reviewService = {
  submitReview: async (payload: SubmitReviewPayload) => {
    const apiStatus = "todo";

    const requestBody = payload.recommendation.map(rec => ({
      recommendation_id: rec.id,
      category: rec.category,
      recommendation: rec.recommendation,
      status: apiStatus as 'approved' | 'todo',
    }));

    return ReportsService.postSubmissionsBySubmissionIdReports({
      submissionId: payload.submission_id,
      requestBody,
    });
  },
};