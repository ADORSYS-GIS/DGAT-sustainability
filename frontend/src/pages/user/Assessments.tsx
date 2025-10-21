/**
 * @file Assessments.tsx
 * @description This file defines the Assessments page, which displays a list of submissions.
 */
import { Navbar } from "@/components/shared/Navbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useAuth } from "@/hooks/shared/useAuth";
import {
  useOfflineSubmissions,
  useOfflineSubmissionsMutation,
} from "@/hooks/useOfflineSubmissions";
import { Submission } from "@/openapi-rq/requests/types.gen";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AssessmentsHeader } from "@/components/pages/user/Assessments/AssessmentsHeader";
import { LoadingIndicator } from "@/components/pages/user/Assessments/LoadingIndicator";
import { NoSubmissions } from "@/components/pages/user/Assessments/NoSubmissions";
import { SubmissionCard } from "@/components/pages/user/Assessments/SubmissionCard";

type SubmissionWithName = Submission & { assessment_name?: string };

export const Assessments: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [submissionToDelete, setSubmissionToDelete] = React.useState<
    string | null
  >(null);

  const {
    data: submissionsData,
    isLoading,
    refetch,
  } = useOfflineSubmissions();
  const submissions = submissionsData?.submissions || [];

  const { deleteSubmission, isPending: isDeleting } =
    useOfflineSubmissionsMutation();

  const isOrgAdmin = () => {
    if (!user?.roles) return false;
    return user.roles.includes("org_admin");
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      await deleteSubmission(submissionId, {
        onSuccess: () => {
          toast.success(
            t("submission.deleted", {
              defaultValue: "Submission deleted successfully",
            })
          );
          refetch();
        },
        onError: (error) => {
          toast.error(
            t("submission.deleteError", {
              defaultValue: "Failed to delete submission",
            })
          );
          console.error("Delete submission error:", error);
        },
      });
    } catch (error) {
      console.error("Delete submission error:", error);
    }
  };

  const confirmDelete = (submissionId: string) => {
    setSubmissionToDelete(submissionId);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (submissionToDelete) {
      await handleDeleteSubmission(submissionToDelete);
    }
    setIsDeleteDialogOpen(false);
    setSubmissionToDelete(null);
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AssessmentsHeader />

        <div className="grid gap-6">
          {submissions.map((submission: SubmissionWithName, index) => (
            <SubmissionCard
              key={submission.submission_id}
              submission={submission}
              navigate={navigate}
              index={index}
              onDelete={confirmDelete}
              isDeleting={isDeleting}
              isOrgAdmin={isOrgAdmin()}
            />
          ))}

          {submissions.length === 0 && !isLoading && <NoSubmissions />}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={executeDelete}
        title={t("confirmDeletion")}
        description={t("confirmDeletionDescription")}
      />
    </div>
  );
};