import type { CancelablePromise } from "@/openapi-rq/requests/core/CancelablePromise";
import { OpenAPI } from "@/openapi-rq/requests/core/OpenAPI";
import { request as __request } from "@/openapi-rq/requests/core/request";

export interface UpdateRecommendationBody {
  category: string;
  recommendation: string;
}

export interface RecommendationMutationResult {
  recommendation_id: string;
  category: string;
  recommendation: string;
  status: string;
}

export class ReportsRecommendationApi {
  public static updateRecommendation(
    reportId: string,
    recommendationId: string,
    body: UpdateRecommendationBody
  ): CancelablePromise<RecommendationMutationResult> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/reports/{report_id}/recommendations/{recommendation_id}",
      path: {
        report_id: reportId,
        recommendation_id: recommendationId,
      },
      body,
      mediaType: "application/json",
    });
  }

  public static deleteRecommendation(
    reportId: string,
    recommendationId: string
  ): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/reports/{report_id}/recommendations/{recommendation_id}",
      path: {
        report_id: reportId,
        recommendation_id: recommendationId,
      },
    });
  }
}
