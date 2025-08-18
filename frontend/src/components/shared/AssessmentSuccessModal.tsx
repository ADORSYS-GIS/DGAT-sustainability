import * as React from "react";
import { CheckCircle, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface AssessmentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToDashboard: () => void;
}

export const AssessmentSuccessModal: React.FC<AssessmentSuccessModalProps> = ({
  isOpen,
  onClose,
  onReturnToDashboard,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("assessment.successTitle", {
              defaultValue: "Assessment Created Successfully!",
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Users className="w-5 h-5" />
            <p className="text-sm">
              {t("assessment.successMessage", {
                defaultValue:
                  "Your users are going to answer the assessment assigned to them.",
              })}
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={onReturnToDashboard}
              className="w-full bg-dgrv-blue hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <span>
                {t("assessment.returnToDashboard", {
                  defaultValue: "Return to Dashboard",
                })}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
