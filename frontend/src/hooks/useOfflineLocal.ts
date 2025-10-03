import { useState, useEffect } from "react";
import { offlineDB } from "../services/indexeddb";
import type {
  OfflineQuestion,
  OfflineAssessment,
  OfflineResponse,
} from "../types/offline";
import type {
  Question,
  Assessment,
  Response,
  CreateAssessmentRequest,
  CreateResponseRequest,
} from "@/openapi-rq/requests/types.gen";
import { DataTransformationService } from "../services/dataTransformation";
import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
// import { AssessmentsService } from "@/openapi-rq/requests";
import { v4 as uuidv4 } from "uuid";
// import { ResponsesService } from "@/openapi-rq/requests/services.gen";

export function useOfflineQuestions() {
  const [data, setData] = useState<{ questions: Question[] }>({
    questions: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    offlineDB.getAllQuestions().then((questions) => {
      setData({ questions: questions as Question[] });
      setIsLoading(false);
    });
  }, []);

  return { data, isLoading };
}

export function useOfflineAssessment({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const [data, setData] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline } = useSyncStatus();

  useEffect(() => {
    if (!assessmentId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function loadAssessment() {
      let assessment = await offlineDB.getAssessment(assessmentId);
      if (!assessment && isOnline) {
        try {
          const remote = await AssessmentsService.getAssessmentsByAssessmentId({
            assessmentId,
          });
          if (remote && remote.assessment) {
            // Transform the server response to offline format before saving
            const offlineAssessment =
              DataTransformationService.transformAssessment(
                remote.assessment,
                undefined,
                undefined,
              );
            await offlineDB.saveAssessment(offlineAssessment);
            assessment = offlineAssessment;
          }
        } catch (err) {
          // ignore, will show not found
        }
      }
      if (!cancelled) {
        setData(assessment as Assessment | null);
        setIsLoading(false);
      }
    }
    loadAssessment();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, isOnline]);

  return { data, isLoading };
}

export function useOfflineAssessmentMutation() {
  return {
    mutate: async (
      assessment: Assessment,
      options?: {
        onSuccess?: (data: Assessment) => void;
        onError?: (err: unknown) => void;
      },
    ) => {
      try {
        // For org admins, make a direct POST request to the server first
        // since assessment creation requires online access
        const createRequest: CreateAssessmentRequest = {
          language: assessment.language || "en",
        };

        const response = await AssessmentsService.postAssessments({
          requestBody: createRequest,
        });

        if (response?.assessment) {
          // Transform the server response to offline format and store locally
          const offlineAssessment =
            DataTransformationService.transformAssessment(
              response.assessment,
              undefined,
              undefined,
            );
          await offlineDB.saveAssessment(offlineAssessment);

          options?.onSuccess?.(response.assessment);
        } else {
          throw new Error("Failed to create assessment on server");
        }
      } catch (err) {
        console.error("Assessment creation failed:", err);
        options?.onError?.(err);
      }
    },
    isPending: false,
  };
}

export function useOfflineResponseMutation() {
  return {
    mutate: async (
      response: CreateResponseRequest,
      options?: {
        onSuccess?: (data: unknown) => void;
        onError?: (err: unknown) => void;
      },
    ) => {
      try {
        // Transform response to offline format
        const offlineResponse: OfflineResponse = {
          response_id: uuidv4(),
          assessment_id: "", // This should be provided in context
          question_revision_id: response.question_revision_id,
          response: response.response,
          version: response.version || 1,
          updated_at: new Date().toISOString(),
          sync_status: "pending",
          local_changes: true,
          last_synced: new Date().toISOString(),
        };

        await offlineDB.saveResponse(offlineResponse);

        // Use OpenAPI-generated service instead of manual endpoint construction
        const result = await ResponsesService.postResponses({
          requestBody: [response],
        });

        options?.onSuccess?.(result);
      } catch (err) {
        options?.onError?.(err);
      }
    },
    isPending: false,
  };
}

export function useOfflineBatchResponseMutation() {
  return {
    mutate: async (
      data: { assessmentId: string; responses: CreateResponseRequest[] },
      options?: {
        onSuccess?: (data: unknown) => void;
        onError?: (err: unknown) => void;
      },
    ) => {
      try {
        // Transform responses to offline format
        const offlineResponses: OfflineResponse[] = data.responses.map(
          (response) => {
            const offlineResponse: OfflineResponse = {
              response_id: uuidv4(),
              assessment_id: data.assessmentId,
              question_revision_id: response.question_revision_id,
              response: response.response,
              version: response.version || 1,
              updated_at: new Date().toISOString(),
              sync_status: "pending",
              local_changes: true,
              last_synced: new Date().toISOString(),
            };
            return offlineResponse;
          },
        );

        await offlineDB.saveResponses(offlineResponses);

        // Use OpenAPI-generated service instead of manual endpoint construction
        const result =
          await ResponsesService.postAssessmentsByAssessmentIdResponses({
            assessmentId: data.assessmentId,
            requestBody: data.responses,
          });

        options?.onSuccess?.(result);
      } catch (err) {
        options?.onError?.(err);
      }
    },
    isPending: false,
  };
}
