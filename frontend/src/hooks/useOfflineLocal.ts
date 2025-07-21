import { useState, useEffect } from "react";
import { offlineDB } from "@/services/indexeddb";
import { useSyncStatus } from "@/hooks/shared/useSyncStatus";
import type { Question, Assessment, CreateAssessmentRequest, CreateResponseRequest } from "@/openapi-rq/requests/types.gen";
import { AssessmentsService } from "@/openapi-rq/requests";

export function useOfflineQuestions() {
  const [data, setData] = useState<{ questions: Question[] }>({ questions: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    offlineDB.getAllQuestions().then((questions) => {
      setData({ questions: questions as Question[] });
      setIsLoading(false);
    });
  }, []);

  return { data, isLoading };
}

export function useOfflineAssessment({ assessmentId }: { assessmentId: string }) {
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
          const remote = await AssessmentsService.getAssessmentsByAssessmentId({ assessmentId });
          if (remote && remote.assessment) {
            await offlineDB.saveAssessment(remote.assessment);
            assessment = remote.assessment;
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
    return () => { cancelled = true; };
  }, [assessmentId, isOnline]);

  return { data, isLoading };
}

export function useOfflineAssessmentMutation() {
  return {
    mutate: async (assessment: CreateAssessmentRequest, options?: { onSuccess?: (data: CreateAssessmentRequest) => void; onError?: (err: unknown) => void }) => {
      try {
        // We assume the assessment object passed here has an `assessment_id` for saving.
        // This might need adjustment based on how assessment IDs are generated.
        await offlineDB.saveAssessment(assessment);
        await offlineDB.addToSyncQueue({ type: "assessment", data: assessment });
        options?.onSuccess?.(assessment);
      } catch (err) {
        options?.onError?.(err);
      }
    },
    isPending: false,
  };
}

export function useOfflineResponseMutation() {
  return {
    mutate: async (response: CreateResponseRequest, options?: { onSuccess?: (data: CreateResponseRequest) => void; onError?: (err: unknown) => void }) => {
      try {
        // The response object needs a unique `response_id` before saving.
        // This should be generated before calling the mutate function.
        await offlineDB.saveResponse(response);
        await offlineDB.addToSyncQueue({ type: "response", data: response });
        options?.onSuccess?.(response);
      } catch (err) {
        options?.onError?.(err);
      }
    },
    isPending: false,
  };
} 