import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { OfflineSubmission } from "@/types/offline";
import { useAuth } from "./shared/useAuth";
import { useOffline } from "./useOffline";

export function useOfflineUserSubmissions() {
  const { user } = useAuth();
  const isOffline = useOffline();
  const [data, setData] = useState<{ submissions: OfflineSubmission[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let organizationId: string | undefined;

      if (user?.organizations) {
        const orgKeys = Object.keys(user.organizations);
        if (orgKeys.length > 0) {
          const orgData = (user.organizations as Record<string, { id: string }>)[orgKeys[0]];
          organizationId = orgData?.id;
        }
      }

      if (!organizationId) {
        const orgs = await offlineDB.getAllOrganizations();
        if (orgs.length > 0) {
          organizationId = orgs[0].id;
        }
      }

      if (!organizationId) {
        setData({ submissions: [] });
        setIsLoading(false);
        return;
      }

      // 1. Get all submissions and filter by user's org
      const allSubmissions = await offlineDB.getAllSubmissions();
      const userSubmissions = allSubmissions.filter(
        (submission) => submission.organization_id === organizationId
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
  }, [fetchData, isOffline]);

  return { data, isLoading, error, refetch: fetchData };
}