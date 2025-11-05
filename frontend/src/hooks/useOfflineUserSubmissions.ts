import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { OfflineSubmission } from "@/types/offline";
import { useAuth } from "./shared/useAuth";

export function useOfflineUserSubmissions() {
  const { user } = useAuth();
  const [data, setData] = useState<{ submissions: OfflineSubmission[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user?.organization) {
        setData({ submissions: [] });
        setIsLoading(false);
        return;
      }

      // 1. Get all submissions and filter by user's org
      const allSubmissions = await offlineDB.getAllSubmissions();
      const userSubmissions = allSubmissions.filter(
        (submission) => submission.organization_id === user.organization
      );

      // 2. Get all recommendations and create a set of submission IDs
      const allRecommendations = await offlineDB.getAllRecommendations();
      const submissionIdsWithRecs = new Set(
        allRecommendations.map(rec => rec.submission_id).filter(id => id)
      );

      // 3. Filter submissions to only include those with recommendations
      const submissionsWithActionPlans = userSubmissions.filter(
        submission => submissionIdsWithRecs.has(submission.submission_id)
      );

      setData({ submissions: submissionsWithActionPlans });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch user submissions")
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}