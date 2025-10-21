// /frontend/src/components/pages/admin/ReportHistory/ReportDetailModal.tsx
/**
 * @file Modal component for displaying detailed report information.
 * @description This component renders a dialog with a detailed breakdown of a selected report, including categories, questions, responses, and recommendations.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AdminReport,
  AdminSubmissionDetail,
  AdminSubmissionDetail_content_responses,
  RecommendationWithStatus,
} from '@/openapi-rq/requests/types.gen';
import {
  Award,
  Building2,
  Calendar,
  ChevronDown,
  Download,
  FileText,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FileDisplay from '@/components/shared/FileDisplay';

interface FileAttachment {
  name?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}

// Define interfaces for the report data structure
interface ReportQuestion {
  question: string;
  answer: {
    percentage?: number;
    text?: string;
    yesNo?: boolean;
    files?: FileAttachment[];
  };
}

interface ReportRecommendation {
  id: string;
  status: string;
  text: string;
}

interface ReportCategoryData {
  questions: ReportQuestion[];
  recommendations: ReportRecommendation[];
}

interface ReportData {
  [category: string]: ReportCategoryData;
}

interface ReportDetailModalProps {
  report: AdminReport | undefined;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (reportId: string, orgName: string) => void;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  isOpen,
  onClose,
  onDownload,
}) => {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (!report || !report.data) return null;

  // Normalize report data to handle both object and array-of-objects responses
  const reportData = (Array.isArray(report.data) ? report.data : [report.data]).reduce(
    (acc, item) => {
      Object.entries(item).forEach(([category, data]) => {
        if (!acc[category]) {
          acc[category] = { questions: [], recommendations: [] };
        }
        acc[category].questions.push(...((data as ReportCategoryData).questions || []));
        acc[category].recommendations.push(...((data as ReportCategoryData).recommendations || []));
      });
      return acc;
    },
    {} as ReportData
  );

  const recommendations = Object.entries(reportData).flatMap(([category, details]) =>
    ((details as ReportCategoryData).recommendations || []).map(rec => ({ ...rec, category }))
  );

  const responses = Object.entries(reportData).flatMap(([category, details]) =>
    ((details as ReportCategoryData).questions || []).map(q => ({
      question_category: category,
      question_text: q.question,
      response: JSON.stringify(q.answer),
      files: q.answer?.files || [],
    }))
  );

  const categories = Object.keys(reportData);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'generating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Generating</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-dgrv-blue flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            {report.org_name} - {t('reportHistory.reportDetails')}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(report.generated_at).toLocaleDateString()}
            </Badge>
            {getStatusBadge(report.status)}
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              ID: {report.report_id}
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          {categories.length > 0 ? (
            categories.map(category => {
              const recsForCategory = recommendations.filter(r => r.category === category);
              const responsesForCategory = responses.filter(r => r.question_category === category);
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                  <div
                    className="p-5 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 cursor-pointer flex justify-between items-center transition-all duration-200 group hover:shadow-md border border-transparent hover:border-gray-200"
                    onClick={() => {
                      const newExpanded = new Set(expandedCategories);
                      if (isExpanded) {
                        newExpanded.delete(category);
                      } else {
                        newExpanded.add(category);
                      }
                      setExpandedCategories(newExpanded);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-6 h-6 text-dgrv-blue" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-dgrv-blue">{category}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-600">
                            {responsesForCategory.length} {t('reportHistory.questions')}
                          </span>
                          {recsForCategory.length > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              <Award className="w-3 h-3 mr-1" />
                              {recsForCategory.length} {recsForCategory.length !== 1 ? t('reportHistory.recommendations') : t('reportHistory.recommendation')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${isExpanded ? 'bg-dgrv-blue' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                      {recsForCategory.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Award className="w-5 h-5 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-semibold text-blue-800">{t('reportHistory.recommendations')}</h4>
                          </div>
                          <div className="grid gap-4">
                            {recsForCategory.map((rec, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-blue-600 text-xs font-bold">{idx + 1}</span>
                                  </div>
                                  <p className="text-gray-800 leading-relaxed">{rec.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <h4 className="text-lg font-semibold text-green-800">{t('reportHistory.questionsAndResponses')}</h4>
                        </div>

                        {responsesForCategory.map((res, idx) => {
                          let responseData: { yesNo?: boolean; percentage?: number; text?: string; files?: FileAttachment[] };
                          try {
                            responseData = JSON.parse(res.response ?? '{}');
                          } catch {
                            responseData = { text: res.response };
                          }

                          return (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                              <div className="p-4 bg-gradient-to-r from-green-50 to-white border-b border-gray-100">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-green-600 text-sm font-bold">{idx + 1}</span>
                                  </div>
                                  <h5 className="text-base font-semibold text-gray-900 leading-relaxed">{res.question_text}</h5>
                                </div>
                              </div>

                              <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {responseData.yesNo !== undefined && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${responseData.yesNo ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                        <span className="text-sm font-medium text-gray-700">{t('reportHistory.yesNo')}</span>
                                      </div>
                                      <Badge
                                        variant={responseData.yesNo ? "default" : "secondary"}
                                        className={`text-sm ${responseData.yesNo ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                                      >
                                        {responseData.yesNo ? t('reportHistory.yes') : t('reportHistory.no')}
                                      </Badge>
                                    </div>
                                  )}

                                  {responseData.percentage !== undefined && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                        <span className="text-sm font-medium text-gray-700">{t('reportHistory.percentage')}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                                          <div
                                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${responseData.percentage}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-sm font-bold text-blue-600">{responseData.percentage}%</span>
                                      </div>
                                    </div>
                                  )}

                                  {responseData.text && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                                        <span className="text-sm font-medium text-gray-700">{t('reportHistory.textResponse')}</span>
                                      </div>
                                      <div className="text-xs text-gray-500">{t('reportHistory.availableBelow')}</div>
                                    </div>
                                  )}
                                </div>

                                {responseData.text && (
                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="w-4 h-4 text-purple-600" />
                                      <span className="text-sm font-medium text-gray-700">{t('reportHistory.detailedResponse')}</span>
                                    </div>
                                    <div className="bg-white rounded-md border border-gray-200 p-4">
                                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{responseData.text}</p>
                                    </div>
                                  </div>
                                )}

                                {(responseData.files && Array.isArray(responseData.files) && responseData.files.length > 0) || (res.files && Array.isArray(res.files) && res.files.length > 0) ? (
                                  <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                      <span className="text-sm font-medium text-blue-700">{t('reportHistory.attachments')}</span>
                                    </div>

                                    {responseData.files && Array.isArray(responseData.files) && responseData.files.length > 0 && (
                                      <div className="mb-4">
                                        <FileDisplay
                                          files={responseData.files as FileAttachment[]}
                                          title={t('reportHistory.responseAttachments')}
                                        />
                                      </div>
                                    )}

                                    {res.files && Array.isArray(res.files) && res.files.length > 0 && (
                                      <div>
                                        <FileDisplay
                                          files={res.files as FileAttachment[]}
                                          title={t('reportHistory.additionalAttachments')}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-8">
              {t('reportHistory.noDetails')}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t('reportHistory.close')}
          </Button>
          <Button
            onClick={() => onDownload(report.report_id, report.org_name)}
            className="bg-dgrv-blue hover:bg-dgrv-blue-dark"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('reportHistory.exportAsPDF')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailModal;