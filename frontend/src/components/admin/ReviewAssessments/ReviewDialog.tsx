/*
 * Review dialog component for assessment review interface
 * Provides comprehensive review interface with submission details and recommendations
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminSubmissionDetail } from "@/openapi-rq/requests/types.gen";
import { SubmissionInfo } from "./SubmissionInfo";
import { AssessmentResponses } from "./AssessmentResponses";

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

interface ReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSubmission: AdminSubmissionDetail | null;
  submissionResponses: Array<{
    question_category: string;
    response: string;
    question_text: string;
  }>;
  categoryRecommendations: CategoryRecommendation[];
  currentComment: string;
  setCurrentComment: (comment: string) => void;
  isAddingRecommendation: string;
  setIsAddingRecommendation: (category: string) => void;
  expandedCategories: Set<string>;
  setExpandedCategories: (categories: Set<string>) => void;
  isSubmitting: boolean;
  onAddRecommendation: (category: string, recommendation: string) => void;
  onRemoveRecommendation: (id: string) => void;
  onSubmitReview: () => void;
  getStatusBadge: (status: string) => {
    variant: string;
    className: string;
    text: string;
  };
}

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedSubmission,
  submissionResponses,
  categoryRecommendations,
  currentComment,
  setCurrentComment,
  isAddingRecommendation,
  setIsAddingRecommendation,
  expandedCategories,
  setExpandedCategories,
  isSubmitting,
  onAddRecommendation,
  onRemoveRecommendation,
  onSubmitReview,
  getStatusBadge,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center space-x-3 text-2xl font-bold text-gray-900">
            <span>Review Assessment</span>
          </DialogTitle>
          <p className="text-gray-600 mt-2">
            {t("reviewAssessments.reviewDescription", {
              defaultValue:
                "Review and provide recommendations for this sustainability assessment",
            })}
          </p>
        </DialogHeader>

        {selectedSubmission && (
          <div className="space-y-6">
            <SubmissionInfo
              selectedSubmission={selectedSubmission}
              getStatusBadge={getStatusBadge}
            />

            <AssessmentResponses
              submissionResponses={submissionResponses}
              categoryRecommendations={categoryRecommendations}
              currentComment={currentComment}
              setCurrentComment={setCurrentComment}
              isAddingRecommendation={isAddingRecommendation}
              setIsAddingRecommendation={setIsAddingRecommendation}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              onAddRecommendation={onAddRecommendation}
              onRemoveRecommendation={onRemoveRecommendation}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t("reviewAssessments.cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                onClick={onSubmitReview}
                disabled={isSubmitting || categoryRecommendations.length === 0}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
                <span>
                  {t("reviewAssessments.submitReview", {
                    defaultValue: "Submit Review",
                  })}
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
