/**
 * @file SubmissionView.tsx
 * @description This file defines the SubmissionView page, which displays details of a single submission.
 */
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { useOfflineSubmissions, useOfflineSubmissionsMutation } from "@/hooks/useOfflineSubmissions";
import { useTranslation } from "react-i18next";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Header } from "@/components/pages/user/SubmissionView/Header";
import { ResponseList } from "@/components/pages/user/SubmissionView/ResponseList";
import { Loading } from "@/components/pages/user/SubmissionView/Loading";
import { Error } from "@/components/pages/user/SubmissionView/Error";
import type { Submission_content_responses } from "../../openapi-rq/requests/types.gen";

// Locally extend the type to include question_category
interface SubmissionResponseWithCategory extends Submission_content_responses {
  question_category?: string;
  question_text?: string; // Add question_text
}

export const SubmissionView: React.FC = () => {
  const { t } = useTranslation();
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const {
    data: submissionsData,
    isLoading: submissionLoading,
    error: submissionError,
  } = useOfflineSubmissions();
  
  const submission = submissionsData?.submissions?.find(s => s.submission_id === submissionId);
  
  const { deleteSubmission: deleteSubmissionMutation } = useOfflineSubmissionsMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    if (submissionId) {
      await deleteSubmissionMutation(submissionId);
      navigate("/user/assessments"); // Redirect after deletion
    }
    setIsDeleteDialogOpen(false);
  };
  
  const responses = submission?.content?.responses as SubmissionResponseWithCategory[] | undefined;

  if (submissionLoading) {
    return <Loading />;
  }
  if (submissionError || !submission) {
    return <Error />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Header
            status={submission.review_status}
            submittedAt={submission.submitted_at}
            reviewedAt={submission.reviewed_at}
          />
          <ResponseList responses={responses} />
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            {t("deleteSubmission")}
          </Button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("confirmDeletion")}
        description={t("confirmDeletionDescription")}
      />
    </div>
  );
};
