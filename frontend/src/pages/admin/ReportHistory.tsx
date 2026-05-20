import { Navbar } from "@/components/shared/Navbar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSync";
import { useOfflineAdminReports } from "@/hooks/useOfflineReports";
import { useOfflineQuestions } from "@/hooks/useOfflineQuestions";
import type {
  AdminReport,
  AdminSubmissionDetail,
  AdminSubmissionDetail_content_responses,
  RecommendationWithStatus,
  Report
} from "@/openapi-rq/requests/types.gen";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import {
  Award,
  Building2,
  Calendar,
  ChevronDown,
  Download,
  Eye,
  FileText,
  RefreshCw
} from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { Bar, Radar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import FileDisplay from "@/components/shared/FileDisplay";
import type { ReportCategoryData } from "@/types/offline";
import { normalizeCategoryName } from "@/utils/categoryUtils";
import {
  buildExportPayloadFromAdminReportData,
  buildExportPayloadFromReport,
  mergeReportCategoryData,
} from "@/utils/reportExportData";
import { buildExportChartUrlsForReport } from "@/utils/exportChartRender";

// Type for file attachments
interface FileAttachment {
  name?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}
// Using generated AdminReport type

const isAdminReportData = (obj: unknown): obj is { submissions: AdminSubmissionDetail[]; recommendations: RecommendationWithStatus[] } => {
  if (!obj || typeof obj !== 'object') return false;
  const maybe = obj as { submissions?: unknown; recommendations?: unknown };
  return Array.isArray(maybe.submissions) && Array.isArray(maybe.recommendations);
};

type NormalizedCategory = {
  name: string;
  responses: Array<{ question_text: string; response: { yesNo?: boolean; percentage?: number; text?: string } }>;
  recommendations?: { id: string; text: string; status: string }[];
};

const normalizeGenericReportData = (data: unknown): NormalizedCategory[] => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const categoriesMap = new Map<string, NormalizedCategory>();
  const reportData = mergeReportCategoryData(data as ReportCategoryData[]);
  for (const [key, value] of Object.entries(reportData)) {
    if (!value || typeof value !== 'object') continue;
    const categoryName = normalizeCategoryName(key);
    const obj = value as Record<string, unknown>;
    const arr = Array.isArray(obj.questions)
      ? (obj.questions as Array<Record<string, unknown>>)
      : [];
    const responses: NormalizedCategory['responses'] = [];
    arr.forEach((q) => {
      const questionText = (q.question as string) || (q.question_text as string) || '';
      const answer = (q.answer as Record<string, unknown>) || (q.response as Record<string, unknown>) || {};
      const yesNo = typeof answer.yesNo === 'boolean' ? (answer.yesNo as boolean) : undefined;
      const percentage = typeof answer.percentage === 'number' ? (answer.percentage as number) : undefined;
      const text = typeof answer.text === 'string' ? (answer.text as string) : undefined;
      responses.push({ question_text: questionText, response: { yesNo, percentage, text } });
    });
    const recommendations = Array.isArray(obj.recommendations)
      ? (obj.recommendations as { id: string; text: string; status: string }[])
        .filter(rec => rec.text !== "No recommendation provided" && rec.text !== "No action plan given")
      : [];
    if (responses.length > 0 || recommendations.length > 0) {
      const existing = categoriesMap.get(categoryName);
      if (existing) {
        existing.responses.push(...responses);
        existing.recommendations?.push(...recommendations);
      } else {
        categoriesMap.set(categoryName, { name: categoryName, responses, recommendations });
      }
    }
  }
  return Array.from(categoriesMap.values());
};

export const ReportHistory: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useOfflineSyncStatus();
  const {
    data,
    isLoading: loading,
    error,
    refetch: loadReports,
  } = useOfflineAdminReports();
  const reports = (data?.reports as AdminReport[]) || [];
  const { data: questionsData } = useOfflineQuestions();

  // Build a map from question revision ID -> display_order for sorting
  const [questionOrderMap, questionsTextMap] = React.useMemo(() => {
    const map = new Map<string, number>();
    const textMap = new Map<string, number>();
    if (questionsData) {
      questionsData.forEach(q => {
        if (q.latest_revision) {
          const displayOrder = q.display_order || 0;
          map.set(q.latest_revision.question_revision_id, displayOrder);
          const qText = (q.latest_revision.text as { en?: string })?.en || '';
          if (qText) {
            textMap.set(qText, displayOrder);
          }
        }
      });
    }
    return [map, textMap];
  }, [questionsData]);
  const navigate = useNavigate();
  const chartRef = React.useRef<ChartJS<"radar">>(null);
  const recommendationChartRef = React.useRef<ChartJS<"bar">>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    ChartJS.register(
      RadialLinearScale,
      PointElement,
      LineElement,
      Filler,
      Tooltip,
      Legend,
      BarElement,
      CategoryScale,
      LinearScale
    );
  }, []);

  const radarChartOptions = {
    maintainAspectRatio: false,
    scales: {
      r: {
        pointLabels: {
          font: {
            size: 14, // Increase font size for category labels
          },
        },
      },
    },
  };

  const radarChartData = React.useMemo(() => {
    const currentReport = reports.find(r => r.report_id === viewReportId);
    if (currentReport && currentReport.data && !isAdminReportData(currentReport.data)) {
      const normalizedData = normalizeGenericReportData(currentReport.data);
      const categories = normalizedData.map(cat => cat.name);
      const scores = normalizedData.map(cat => {
        const totalQuestions = cat.responses.length;
        const yesCount = cat.responses.filter(res => res.response.yesNo === true).length;
        return totalQuestions > 0 ? (yesCount / totalQuestions) * 100 : 0;
      });

      return {
        labels: categories,
        datasets: [
          {
            label: 'Category Score',
            data: scores,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
          },
        ],
      };
    }
    return null;
  }, [reports, viewReportId, t]);

  const recommendationChartInfo = React.useMemo(() => {
    const currentReport = reports.find(r => r.report_id === viewReportId);
    if (currentReport && currentReport.data && !isAdminReportData(currentReport.data)) {
      const normalizedData = normalizeGenericReportData(currentReport.data);
      const categories = normalizedData.map(cat => cat.name);
      const recommendationCounts = normalizedData.map(cat => cat.recommendations?.length || 0);

      return {
        data: {
          labels: categories,
          datasets: [
            {
              label: t('common.recommendations'),
              data: recommendationCounts,
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top' as const,
            },
            title: {
              display: true,
              text: t('recommendationsPerCategory'),
            },
          },
        },
      };
    }
    return null;
  }, [reports, viewReportId, t]);

  const mapReportToExportInputs = (report: Report) =>
    buildExportPayloadFromReport({
      report_id: report.report_id,
      submission_id: report.submission_id,
      assessment_id: report.assessment_id,
      assessment_name: report.assessment_name,
      generated_at: report.generated_at,
      data: report.data,
    });

  useEffect(() => {
    if (error) {
      toast.error(t("reportHistory.loadError"));
    }
  }, [error, t]);

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.assessment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesOrg = !selectedOrgId || report.org_id === selectedOrgId;

    return matchesSearch && matchesStatus && matchesOrg;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('reportHistory.completed')}</Badge>;
      case 'generating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('reportHistory.generating')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('reportHistory.failed')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewReport = (reportId: string) => {
    setViewReportId(reportId);
  };

  const renderReadable = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-gray-500">—</span>;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <span className="text-gray-800">{String(value)}</span>;
    }
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((item, idx) => (
            <li key={idx} className="text-gray-700">{renderReadable(item)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      return (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-3 items-start">
              <div className="col-span-1 font-medium text-gray-700 break-words">{k}</div>
              <div className="col-span-2 text-gray-800 break-words">{renderReadable(v)}</div>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-gray-800">{String(value)}</span>;
  };

  const handleDownloadReport = async (reportId: string, _orgName: string) => {
    try {
      const report = reports.find(r => r.report_id === reportId);
      if (!report || !report.data) throw new Error('No data available for this report');

      const reportToExport: Report = {
        report_id: report.report_id,
        submission_id: report.submission_id,
        generated_at: report.generated_at,
        status: report.status as "generating" | "completed" | "failed",
        data: report.data,
        assessment_id: report.submission_id || "",
        assessment_name: report.assessment_name || "Unknown Assessment",
      };

      let singleSubmissions: AdminSubmissionDetail[];
      let singleRecs: RecommendationWithStatus[];

      if (isAdminReportData(report.data)) {
        const payload = buildExportPayloadFromAdminReportData(
          {
            report_id: report.report_id,
            submission_id: report.submission_id,
            assessment_id: report.submission_id,
            assessment_name: report.assessment_name,
            generated_at: report.generated_at,
            data: report.data,
          },
          report.data
        );
        singleSubmissions = payload.submissions;
        singleRecs = payload.recommendations;
      } else {
        const payload = mapReportToExportInputs(reportToExport);
        singleSubmissions = payload.submissions;
        singleRecs = payload.recommendations;
      }

      const chartUrls = buildExportChartUrlsForReport(reportToExport, singleRecs);

      const { exportAllAssessmentsPDF } = await import("@/utils/exportPDF");
      await exportAllAssessmentsPDF(
        singleSubmissions,
        singleRecs,
        chartUrls.radarChartDataUrl,
        chartUrls.recommendationChartDataUrl,
        report.org_name,
        report.assessment_name || "Unknown Assessment",
        t,
        report.report_id
      );
      toast.success(t('reportHistory.downloadSuccess'));
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error(t('reportHistory.downloadError'));
    }
  };

  if (loading) {
    return <LoadingSpinner size="hero" fullPage text={t("loading")} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {recommendationChartInfo && (
        <div style={{ width: '800px', height: '400px', position: 'absolute', zIndex: -1, opacity: 0 }}>
          <Bar
            ref={recommendationChartRef}
            data={recommendationChartInfo.data}
            options={recommendationChartInfo.options}
            plugins={recommendationChartInfo.plugins}
          />
        </div>
      )}
      {radarChartData && (
        <div style={{ width: '800px', height: '400px', position: 'absolute', zIndex: -1, opacity: 0 }}>
          <Radar ref={chartRef} data={radarChartData} options={radarChartOptions} />
        </div>
      )}
      <Navbar />

      <div className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="w-8 h-8 text-dgrv-blue" />
                  <h1 className="text-3xl font-bold text-dgrv-blue">
                    {t('reportHistory.title')}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('reportHistory.subtitle')}
                </p>
              </div>

              <Button
                onClick={loadReports}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('reportHistory.refresh')}</span>
              </Button>
            </div>
          </div>

          {/* Organization Selector (Step 1) */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-dgrv-blue" />
                <span className="font-medium text-gray-700">{t('reportHistory.organizations')}</span>
              </div>
              {selectedOrgId && (
                <Button variant="outline" size="sm" onClick={() => setSelectedOrgId(null)}>
                  {t('reportHistory.backToOrganizations')}
                </Button>
              )}
            </div>
            {!selectedOrgId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {Array.from(new Map(reports.map(r => [r.org_id, r.org_name])).entries()).map(([orgId, orgName]) => (
                  <Card key={orgId} className="hover:shadow-md cursor-pointer" onClick={() => setSelectedOrgId(orgId)}>
                    <CardHeader>
                      <CardTitle className="text-dgrv-blue text-base">{orgName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        {t('reportHistory.reportsFound')}: {reports.filter(r => r.org_id === orgId).length}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {reports.length === 0 && (
                  <div className="text-center text-gray-500 py-8 col-span-full">
                    {t('reportHistory.noReports')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reports Grid */}
          <div className="grid gap-6">
            {selectedOrgId && filteredReports.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                {t('reportHistory.noReports')}
              </div>
            )}
            {selectedOrgId && filteredReports.map((report, index) => (
              <Card
                key={report.report_id}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-blue-50">
                        <FileText className="w-5 h-5 text-dgrv-blue" />
                      </div>
                      <div>
                        <div className="font-semibold text-dgrv-blue">{report.org_name}</div>
                        <div className="text-sm text-gray-600">{report.assessment_name}</div>
                        <div className="text-xs text-gray-500">{t('reportHistory.report')}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>{report.org_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{report.assessment_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(report.generated_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewReport(report.report_id)} className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>{t('reportHistory.view')}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.report_id, report.org_name)} className="flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>{t('reportHistory.download')}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      <Dialog open={!!viewReportId} onOpenChange={(open) => {
        if (!open) {
          setViewReportId(null);
          setExpandedCategories(new Set());
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const report = reports.find(r => r.report_id === viewReportId);
            if (!report) return null;

            const data = (report.data || {}) as unknown;
            const submissions: AdminSubmissionDetail[] = isAdminReportData(data) ? data.submissions : [];
            const recommendations: RecommendationWithStatus[] = isAdminReportData(data) ? data.recommendations : [];
            const responses: AdminSubmissionDetail_content_responses[] = submissions.flatMap(s => (s.content?.responses as AdminSubmissionDetail_content_responses[] | undefined) || []);

            const categoriesSet = new Set<string>([
              ...responses.map((r) => normalizeCategoryName(r.question_category as string)).filter(Boolean),
              ...recommendations.map(r => normalizeCategoryName(r.category)).filter(Boolean)
            ]);
            const categories = Array.from(categoriesSet);
            const genericCategories = isAdminReportData(data) ? [] : normalizeGenericReportData(data);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-dgrv-blue flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    {report.org_name} - {report.assessment_name}
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
                      const recsForCategory = recommendations.filter(r =>
                        normalizeCategoryName(r.category) === category &&
                        r.recommendation !== "No recommendation provided" &&
                        r.recommendation !== "No action plan given"
                      );
                      const responsesForCategory = responses
                        .filter(r => normalizeCategoryName(r.question_category as string) === category)
                        .sort((a, b) => {
                          const getOrder = (resp: any) => {
                            const questionTextStr = typeof resp.question === 'object' ? resp.question.en : resp.question;
                            if (resp.question_revision_id && questionOrderMap.has(resp.question_revision_id)) {
                              return questionOrderMap.get(resp.question_revision_id)!;
                            } else if (questionTextStr && questionsTextMap.has(questionTextStr)) {
                              return questionsTextMap.get(questionTextStr)!;
                            }
                            return 9999;
                          };
                          return getOrder(a) - getOrder(b);
                        });
                      const isExpanded = expandedCategories.has(category);

                      return (
                        <div key={category} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                          {/* Category Header - Clickable to expand/collapse */}
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
                                    {t('questionsCount', {count: responsesForCategory.length})}
                                  </span>
                                  {recsForCategory.length > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      <Award className="w-3 h-3 mr-1" />
                                      {t('recommendationsCount', {count: recsForCategory.length})}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${isExpanded ? 'bg-dgrv-blue' : 'bg-gray-300'}`}></div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                              {/* Recommendations Section */}
                              {recsForCategory.length > 0 && (
                                <div className="mb-8">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                      <Award className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-blue-800">{t('common.recommendations')}</h4>
                                  </div>
                                  <div className="grid gap-4">
                                    {recsForCategory.map((rec, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-blue-400 shadow-sm">
                                        <div className="flex items-start gap-3">
                                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-blue-600 text-xs font-bold">{idx + 1}</span>
                                          </div>
                                          <p className="text-gray-800 leading-relaxed">{rec.recommendation}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Questions and Responses */}
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
                                      {/* Question Header */}
                                      <div className="p-4 bg-gradient-to-r from-green-50 to-white border-b border-gray-100">
                                        <div className="flex items-start gap-3">
                                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-green-600 text-sm font-bold">{idx + 1}</span>
                                          </div>
                                          <h5 className="text-base font-semibold text-gray-900 leading-relaxed">{res.question_text}</h5>
                                        </div>
                                      </div>

                                      {/* Response Content */}
                                      <div className="p-5 space-y-4">
                                        {/* Response Types Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          {/* Yes/No Response */}
                                          {responseData.yesNo !== undefined && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-3 h-3 rounded-full ${responseData.yesNo ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                <span className="text-sm font-medium text-gray-700">{t('common.yesNo')}</span>
                                              </div>
                                              <Badge
                                                variant={responseData.yesNo ? "default" : "secondary"}
                                                className={`text-sm ${responseData.yesNo ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                                              >
                                                {responseData.yesNo ? 'Yes' : 'No'}
                                              </Badge>
                                            </div>
                                          )}

                                          {/* Percentage Response */}
                                          {responseData.percentage !== undefined && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                              <div className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                                <span className="text-sm font-medium text-gray-700">{t('common.percentage')}</span>
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

                                          {/* Text Response Indicator */}
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

                                        {/* Detailed Text Response */}
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

                                        {/* Files Section */}
                                        {(responseData.files && Array.isArray(responseData.files) && responseData.files.length > 0) || (res.files && Array.isArray(res.files) && res.files.length > 0) ? (
                                          <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                                              <span className="text-sm font-medium text-blue-700">{t('common.attachments')}</span>
                                            </div>

                                            {/* Files in responseData */}
                                            {responseData.files && Array.isArray(responseData.files) && responseData.files.length > 0 && (
                                              <div className="mb-4">
                                                <FileDisplay
                                                  files={responseData.files as FileAttachment[]}
                                                  title={t('reportHistory.responseAttachments')}
                                                />
                                              </div>
                                            )}

                                            {/* Files attached to the response itself */}
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
                  ) : genericCategories.length > 0 ? (
                    <div className="space-y-4">
                      {genericCategories.map((cat, catIdx) => (
                        <div key={cat.name} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          {/* Generic Category Header */}
                          <div className="p-5 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-bold">{catIdx + 1}</span>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-purple-800">{cat.name}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-sm text-gray-600">{t('questionsCount', {count: cat.responses.length})}</span>
                                  {cat.recommendations && cat.recommendations.length > 0 && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                      <Award className="w-3 h-3 mr-1" />
                                      {t('recommendationsCount', {count: cat.recommendations.length})}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Generic Category Content */}
                          <div className="p-6 bg-gray-50 space-y-6">
                            {/* Generic Recommendation */}
                            {cat.recommendations && cat.recommendations.length > 0 && (
                              <div className="bg-white rounded-lg p-4 border-l-4 border-purple-400">
                                <div className="flex items-center gap-2 mb-2">
                                  <Award className="w-5 h-5 text-purple-600" />
                                  <span className="font-semibold text-purple-800">{t('common.recommendations')}</span>
                                </div>
                                <div className="space-y-3">
                                  {cat.recommendations.map((rec, idx) => (
                                    <div key={rec.id || idx} className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-purple-600 text-xs font-bold">{idx + 1}</span>
                                      </div>
                                      <p className="text-gray-700 leading-relaxed">{rec.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Generic Questions */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <span className="font-semibold text-purple-800">{t('reportHistory.questionsAndAnswers')}</span>
                              </div>

                              {cat.responses.map((res, idx) => (
                                <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-purple-600 text-xs font-bold">{idx + 1}</span>
                                    </div>
                                    <h5 className="font-semibold text-gray-900">{res.question_text}</h5>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {res.response.text && (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                          <span className="text-xs font-medium text-gray-600">{t('common.text')}</span>
                                        </div>
                                        <p className="text-sm text-gray-800">{res.response.text}</p>
                                      </div>
                                    )}

                                    {res.response.yesNo !== undefined && (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className={`w-2 h-2 rounded-full ${res.response.yesNo ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                          <span className="text-xs font-medium text-gray-600">{t('common.answer')}</span>
                                        </div>
                                        <Badge
                                          variant={res.response.yesNo ? "default" : "secondary"}
                                          className={`text-xs ${res.response.yesNo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                          {res.response.yesNo ? 'Yes' : 'No'}
                                        </Badge>
                                      </div>
                                    )}

                                    {res.response.percentage !== undefined && (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                          <span className="text-xs font-medium text-gray-600">{t('common.percentage')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                                              style={{ width: `${res.response.percentage}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-sm font-bold text-blue-600">{res.response.percentage}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      {t('reportHistory.noDetails')}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewReportId(null);
                      setExpandedCategories(new Set());
                    }}
                  >
                    {t('reportHistory.close')}
                  </Button>
                  <Button
                    onClick={() => handleDownloadReport(report.report_id, report.org_name)}
                    className="bg-dgrv-blue hover:bg-dgrv-blue-dark"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('reportHistory.exportAsPDF')}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
