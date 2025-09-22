import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Report, Assessment, Submission } from "@/openapi-rq/requests/types.gen";
import { useTranslation } from "react-i18next";

interface ReportSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: Report[];
  onReportSelect: (report: Report) => void;
  title?: string;
  description?: string;
  assessments?: Assessment[];
  submissions?: Submission[];
}

export const ReportSelectionDialog: React.FC<ReportSelectionDialogProps> = ({
  open,
  onOpenChange,
  reports,
  onReportSelect,
  title,
  description,
  assessments = [],
  submissions = [],
}) => {
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getReportTypeDisplay = (reportType: string) => {
    switch (reportType) {
      case "sustainability":
        return t('user.dashboard.actionPlan.reportTypes.sustainability');
      case "compliance":
        return t('user.dashboard.actionPlan.reportTypes.compliance');
      case "summary":
        return t('user.dashboard.actionPlan.reportTypes.summary');
      case "detailed":
        return t('user.dashboard.actionPlan.reportTypes.detailed');
      default:
        return reportType;
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "completed":
        return t('user.dashboard.actionPlan.reportStatus.completed');
      case "generating":
        return t('user.dashboard.actionPlan.reportStatus.generating');
      case "failed":
        return t('user.dashboard.actionPlan.reportStatus.failed');
      default:
        return status;
    }
  };

  // Function to find assessment name for a report
  const getAssessmentNameForReport = (report: Report): string => {
    // Find the submission that matches this report's submission_id
    const submission = submissions.find(sub => sub.submission_id === report.submission_id);
    
    if (!submission) {
      return t("reportHistory.unknownAssessment");
    }
    
    // Find the assessment that matches this submission's assessment_id
    const assessment = assessments.find(ass => ass.assessment_id === submission.assessment_id);
    
    return assessment?.name || t("reportHistory.unknownAssessment");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {title || t('user.dashboard.actionPlan.selectReport')}
          </DialogTitle>
          <DialogDescription>
            {description || t('user.dashboard.actionPlan.selectReportDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('user.dashboard.actionPlan.noReportsAvailable')}</p>
            </div>
          ) : (
            reports.map((report) => {
              const assessmentName = getAssessmentNameForReport(report);
              return (
                <div
                  key={report.report_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onReportSelect(report)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-dgrv-blue">
                          {getReportTypeDisplay((report as Report & { report_type?: string }).report_type || 'sustainability')}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          <p>
                            Assessment: {assessmentName}
                          </p>
                          <p>
                            {t('user.dashboard.actionPlan.submissionId')}: {report.submission_id.substring(0, 8)}...
                          </p>
                          <p>
                            {t('user.dashboard.actionPlan.generatedAt')}: {formatDate(report.generated_at)}
                          </p>
                          <p>
                            {t('user.dashboard.actionPlan.statusLabel')}: {" "}
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                report.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : report.status === "generating"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {getStatusDisplay(report.status)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReportSelect(report);
                      }}
                    >
                      {t('user.dashboard.actionPlan.select')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};