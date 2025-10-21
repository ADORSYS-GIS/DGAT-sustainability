/**
 * @file DraftSubmissions.tsx
 * @description This file defines the Draft Submissions page, which allows admins to review and approve draft submissions.
 */
import {
  useOfflineDraftSubmissions,
  useOfflineDraftSubmissionsMutation,
} from "@/hooks/useOfflineDraftSubmissions";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DraftSubmissionCard } from "@/components/pages/user/DraftSubmissions/DraftSubmissionCard";
import { DraftSubmissionDetail } from "@/components/pages/user/DraftSubmissions/DraftSubmissionDetail";
import { DraftSubmissionsHeader } from "@/components/pages/user/DraftSubmissions/DraftSubmissionsHeader";
import { Loading } from "@/components/pages/user/DraftSubmissions/Loading";
import { NoDraftSubmissions } from "@/components/pages/user/DraftSubmissions/NoDraftSubmissions";
import { DraftSubmission } from "@/components/pages/user/DraftSubmissions/types";

export default function DraftSubmissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data: draftSubmissions,
    isLoading,
    error,
    refetch,
  } = useOfflineDraftSubmissions();
  const { approveDraftSubmission } = useOfflineDraftSubmissionsMutation();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<DraftSubmission | null>(null);

  const handleApprove = (submissionId: string) => {
    setApprovingId(submissionId);
    approveDraftSubmission.mutate(submissionId, {
      onSuccess: () => {
        toast.success(
          t("user.draftSubmissions.approvedOfflineSuccessfully", {
            defaultValue:
              "Successfully approved, will sync when you come back online",
          })
        );
        setSelectedSubmission(null);
        navigate("/user/dashboard");
      },
      onError: () => {
        toast.error(
          t("user.draftSubmissions.failedToApprove", {
            defaultValue: "Failed to approve assessment.",
          })
        );
      },
      onSettled: () => {
        setApprovingId(null);
      },
    });
  };

  const handleViewDetails = (submission: DraftSubmission) => {
    setSelectedSubmission(submission);
  };

  const handleBackToList = () => {
    setSelectedSubmission(null);
  };

  if (isLoading || error) {
    return <Loading error={error} refetch={refetch} />;
  }

  const submissions =
    (draftSubmissions.draft_submissions as unknown as DraftSubmission[]) || [];

  if (selectedSubmission) {
    return (
      <DraftSubmissionDetail
        submission={selectedSubmission}
        onBack={handleBackToList}
        onApprove={handleApprove}
        isApproving={approvingId === selectedSubmission.submission_id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <DraftSubmissionsHeader />

        {submissions.length === 0 ? (
          <NoDraftSubmissions />
        ) : (
          <div className="grid gap-6">
            {submissions.map((submission) => (
              <DraftSubmissionCard
                key={submission.submission_id}
                submission={submission}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
