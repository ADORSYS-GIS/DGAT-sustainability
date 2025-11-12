import { useState, useEffect, useCallback } from "react";
import { offlineDB } from "../services/indexeddb";
import { AdminSubmissionWithNames } from "@/types/offline";
import { useAuth } from "./shared/useAuth";
import { AdminSubmissionDetail } from "@/openapi-rq/requests/types.gen";

export function useOfflineAdminSubmissions(organizationId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<{ submissions: AdminSubmissionWithNames[] }>({ submissions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const submissions = await offlineDB.getAllSubmissions();
      const result = { submissions: submissions as unknown as AdminSubmissionDetail[] };

      let filteredSubmissions = result.submissions;

      if (organizationId) {
        filteredSubmissions = result.submissions.filter(
          (submission) => submission.org_id === organizationId
        );
      } else if (user?.organizations) {
        const orgKeys = Object.keys(user.organizations);
        if (orgKeys.length > 0) {
          const orgData = (user.organizations as Record<string, { id: string; categories: string[] }>)[orgKeys[0]];
          const userOrganizationId = orgData?.id;
          if (userOrganizationId) {
            filteredSubmissions = result.submissions.filter(
              (submission) => submission.org_id === userOrganizationId
            );
          }
        }
      }

      const allAssessments = await offlineDB.getAllAssessments();
      const assessmentNameMap = new Map(
        allAssessments.map((a) => [a.assessment_id, a.name])
      );

      const allOrganizations = await offlineDB.getAllOrganizations();
      const organizationNameMap = new Map(
        allOrganizations.map((o) => [o.organization_id, o.name])
      );

      const adminSubmissions: AdminSubmissionWithNames[] = filteredSubmissions.map((submission) => {
        const assessmentName =
          (submission as AdminSubmissionDetail & { assessment_name?: string }).assessment_name ||
          assessmentNameMap.get(submission.assessment_id) ||
          "Unknown Assessment";

        const organizationName =
          organizationNameMap.get(submission.org_id) || "Unknown Organization";

        return {
          ...submission,
          ...submission,
          org_name: organizationName,
          assessment_name: assessmentName,
          review_status:
            submission.review_status as AdminSubmissionWithNames["review_status"],
        } as AdminSubmissionWithNames;
      });

      setData({ submissions: adminSubmissions });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch admin submissions")
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}