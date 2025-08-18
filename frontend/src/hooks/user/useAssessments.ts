import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/shared/useAuth";
import {
  useOfflineSubmissions,
  useOfflineSubmissionsMutation,
} from "@/hooks/useOfflineApi";
import { syncService } from "@/services/syncService";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Submission } from "@/openapi-rq/requests/types.gen";

type AuthUser = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  organizations?: Record<string, unknown>;
  realm_access?: { roles?: string[] };
  organisation_name?: string;
  organisation?: string;
};

export const useAssessments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all submissions for the current user/org
  const { data, isLoading: remoteLoading, refetch } = useOfflineSubmissions();
  const submissions = data?.submissions || [];

  // Delete submission mutation
  const { deleteSubmission, isPending: isDeleting } =
    useOfflineSubmissionsMutation();

  useEffect(() => {
    setIsLoading(remoteLoading);
  }, [remoteLoading]);

  // Helper function to count unique categories completed and total for a submission
  const getCategoryCounts = (submission: Submission) => {
    try {
      // Extract responses from submission content
      const responses = submission?.content?.responses || [];
      const completed = responses.length;

      // For total categories, we need to get the assessment details
      // For now, we'll use a reasonable estimate or fetch from assessment
      const total = completed > 0 ? Math.max(completed, 3) : 0; // Default to at least 3 categories

      return { completed, total };
    } catch (error) {
      console.warn("Error calculating category counts:", error);
      return { completed: 0, total: 0 };
    }
  };

  // Helper function to check if user is org_admin
  const isOrgAdmin = () => {
    if (!user?.roles) return false;
    return user.roles.includes("org_admin");
  };

  // Handle delete submission
  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await deleteSubmission(submissionId, {
        onSuccess: () => {
          toast.success(
            t("submission.deleted", {
              defaultValue: "Submission deleted successfully",
            }),
          );
          refetch(); // Refresh the list
        },
        onError: (error) => {
          toast.error(
            t("submission.deleteError", {
              defaultValue: "Failed to delete submission",
            }),
          );
          console.error("Delete submission error:", error);
        },
      });
    } catch (error) {
      console.error("Delete submission error:", error);
    }
  };

  // Manual sync function
  const handleManualSync = async () => {
    try {
      await syncService.performFullSync();
      await refetch(); // Refresh the submissions list
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  // Handle view submission
  const handleViewSubmission = (submissionId: string) => {
    navigate(`/submission-view/${submissionId}`);
  };

  return {
    // State
    isLoading,
    isDeleting,

    // Data
    submissions,
    user,

    // Functions
    getCategoryCounts,
    isOrgAdmin,
    handleDeleteSubmission,
    handleManualSync,
    handleViewSubmission,
  };
};
