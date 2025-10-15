import { Navbar } from "@/components/shared/Navbar";
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
import type {
  AdminReport,
  AdminSubmissionDetail,
  AdminSubmissionDetail_content_responses,
  RecommendationWithStatus,
  Report
} from "@/openapi-rq/requests/types.gen";
import { exportAllAssessmentsPDF } from "@/utils/exportPDF";
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

// Local types to map report.data into existing export inputs
interface ReportAnswer {
  yesNo?: boolean;
  percentage?: number;
  text?: string;
}
interface ReportQuestionItem {
  question?: string;
  answer?: ReportAnswer;
}
interface ReportCategoryData {
  questions?: ReportQuestionItem[];
  recommendations?: { id: string; text: string; status: "todo" | "in_progress" | "done" | "approved" | string }[];
}

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
    const categories: NormalizedCategory[] = [];
    const reportData = data[0] as Record<string, unknown>;
    for (const [key, value] of Object.entries(reportData)) {
      if (!value || typeof value !== 'object') continue;
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
        : [];
      if (responses.length > 0 || recommendations.length > 0) {
        categories.push({ name: key, responses, recommendations });
      }
    }
    return categories;
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
  }, [reports, viewReportId]);

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
              label: 'Recommendations',
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
              text: 'Recommendations per Category',
            },
          },
        },
      };
    }
    return null;
  }, [reports, viewReportId]);

  const mapReportToExportInputs = (
    report: Report
  ): { submissions: AdminSubmissionDetail[]; recommendations: RecommendationWithStatus[] } => {
    const categoriesObj: Record<string, ReportCategoryData> =
      Array.isArray(report.data) && report.data.length > 0
        ? (report.data[0] as unknown as Record<string, ReportCategoryData>)
        : {};

    // Build a pseudo AdminSubmissionDetail with responses shaped for drawTable
    const responses = Object.entries(categoriesObj).flatMap(
      ([category, categoryData]) => {
        const questions = Array.isArray(categoryData?.questions)
          ? categoryData.questions!
          : [];
        return questions.map((q): { question_category: string; question_text: string; response: string } => ({
          question_category: category,
          question_text: q?.question ?? "",
          response: JSON.stringify(q?.answer ?? {}),
        }));
      }
    );

    const submissions: AdminSubmissionDetail[] = [
      ({
        submission_id: report.report_id, // Use report_id as submission_id for AdminReport
        assessment_id: "",
        user_id: "",
        org_id: "",
        org_name: "",
        content: {
          assessment: { assessment_id: "" },
          responses,
        },
        review_status: "reviewed",
        submitted_at: report.generated_at,
        reviewed_at: report.generated_at,
      } as unknown) as AdminSubmissionDetail,
    ];

    const recommendations: RecommendationWithStatus[] = Object.entries(categoriesObj).flatMap(
      ([category, categoryData]) => {
        const categoryRecommendations = Array.isArray(categoryData?.recommendations)
          ? categoryData.recommendations
          : [];
        return categoryRecommendations.map((rec) => ({
          recommendation_id: rec.id,
          report_id: report.report_id,
          category,
          recommendation: rec.text,
          status: (rec.status as RecommendationWithStatus["status"]) || "todo",
          created_at: report.generated_at,
        }));
      }
    );

    return { submissions, recommendations };
  };

  useEffect(() => {
    if (error) {
      toast.error(t("reportHistory.loadError", { defaultValue: "Failed to load reports" }));
    }
  }, [error, t]);

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesOrg = !selectedOrgId || report.org_id === selectedOrgId;
    
    return matchesSearch && matchesStatus && matchesOrg;
  });

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

  const handleDownloadReport = async (reportId: string, orgName: string) => {
    try {
      const report = reports.find(r => r.report_id === reportId);
      if (!report || !report.data) throw new Error('No data available for this report');

      let submissionId: string = report.report_id;
      // Assuming report.data might contain submissions if it's an AdminReportData structure
      if (isAdminReportData(report.data) && report.data.submissions.length > 0) {
        submissionId = report.data.submissions[0].submission_id || report.report_id;
      }

      const reportToExport: Report = {
        report_id: report.report_id,
        submission_id: submissionId,
        report_type: "sustainability", // Defaulting to a common report type
        generated_at: report.generated_at,
        status: report.status as "generating" | "completed" | "failed", // Cast to the correct literal type
        data: report.data,
      };

      const { submissions: singleSubmissions, recommendations: singleRecs } =
        mapReportToExportInputs(reportToExport);

      // Generate chart data URLs (if charts are present in this view)
      const radarChartDataUrl = chartRef.current?.toBase64Image();
      const recommendationChartDataUrl = recommendationChartRef.current?.toBase64Image();

      await exportAllAssessmentsPDF(
        singleSubmissions,
        singleRecs,
        radarChartDataUrl,
        recommendationChartDataUrl
      );
      toast.success(t('reportHistory.downloadSuccess', { defaultValue: 'Report downloaded successfully' }));
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error(t('reportHistory.downloadError', { defaultValue: 'Failed to download report' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {recommendationChartInfo && (
        <div style={{ width: '800px', height: '400px', position: 'absolute', zIndex: -1, opacity: 0 }}>
          <Bar
            ref={recommendationChartRef}
            data={recommendationChartInfo.data}
            options={recommendationChartInfo.options}
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
                    {t('reportHistory.title', { defaultValue: 'Report History' })}
                  </h1>
                </div>
                <p className="text-lg text-gray-600">
                  {t('reportHistory.subtitle', { defaultValue: 'View and manage all organization reports' })}
                </p>
              </div>

              <Button 
                onClick={loadReports}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('reportHistory.refresh', { defaultValue: 'Refresh' })}</span>
              </Button>
            </div>
          </div>

          {/* Organization Selector (Step 1) */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-dgrv-blue" />
                <span className="font-medium text-gray-700">{t('reportHistory.organizations', { defaultValue: 'Organizations' })}</span>
              </div>
              {selectedOrgId && (
                <Button variant="outline" size="sm" onClick={() => setSelectedOrgId(null)}>
                  {t('reportHistory.backToOrganizations', { defaultValue: 'Back to organizations' })}
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
                        {t('reportHistory.reportsFound', { defaultValue: 'reports found' })}: {reports.filter(r => r.org_id === orgId).length}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {reports.length === 0 && (
                  <div className="text-center text-gray-500 py-8 col-span-full">
                    {t('reportHistory.noReports', { defaultValue: 'No reports found' })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reports Grid */}
          <div className="grid gap-6">
            {selectedOrgId && filteredReports.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                {t('reportHistory.noReports', { defaultValue: 'No reports found' })}
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
                        <div className="text-xs text-gray-500">{t('reportHistory.reportId', { defaultValue: 'Report' })}: {report.report_id}</div>
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
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(report.generated_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewReport(report.report_id)} className="flex items-center space-x-2">
                        <Eye className="w-4 h-4" />
                        <span>{t('reportHistory.view', { defaultValue: 'View' })}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.report_id, report.org_name)} className="flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>{t('reportHistory.download', { defaultValue: 'Download' })}</span>
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
              ...responses.map((r) => r.question_category as string).filter(Boolean),
              ...recommendations.map(r => r.category).filter(Boolean)
            ]);
            const categories = Array.from(categoriesSet);
            const genericCategories = isAdminReportData(data) ? [] : normalizeGenericReportData(data);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-dgrv-blue flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    {report.org_name} - Report Details
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
                                    {responsesForCategory.length} questions
                                  </span>
                                  {recsForCategory.length > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      <Award className="w-3 h-3 mr-1" />
                                      {recsForCategory.length} recommendation{recsForCategory.length !== 1 ? 's' : ''}
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
                                    <h4 className="text-lg font-semibold text-blue-800">Recommendations</h4>
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
                                  <h4 className="text-lg font-semibold text-green-800">Questions & Responses</h4>
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
                                                <span className="text-sm font-medium text-gray-700">Yes/No</span>
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
                                                <span className="text-sm font-medium text-gray-700">Percentage</span>
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
                                                <span className="text-sm font-medium text-gray-700">Text Response</span>
                                              </div>
                                              <div className="text-xs text-gray-500">Available below</div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Detailed Text Response */}
                                        {responseData.text && (
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                              <FileText className="w-4 h-4 text-purple-600" />
                                              <span className="text-sm font-medium text-gray-700">Detailed Response</span>
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
                                              <span className="text-sm font-medium text-blue-700">Attachments</span>
                                            </div>
                                            
                                            {/* Files in responseData */}
                                            {responseData.files && Array.isArray(responseData.files) && responseData.files.length > 0 && (
                                              <div className="mb-4">
                                                <FileDisplay
                                                  files={responseData.files as FileAttachment[]}
                                                  title="Response Attachments"
                                                />
                                              </div>
                                            )}
                                            
                                            {/* Files attached to the response itself */}
                                            {res.files && Array.isArray(res.files) && res.files.length > 0 && (
                                              <div>
                                                <FileDisplay
                                                  files={res.files as FileAttachment[]}
                                                  title="Additional Attachments"
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
                                  <span className="text-sm text-gray-600">{cat.responses.length} questions</span>
                                  {cat.recommendations && cat.recommendations.length > 0 && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                      <Award className="w-3 h-3 mr-1" />
                                      {cat.recommendations.length} recommendation{cat.recommendations.length !== 1 ? 's' : ''}
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
                                  <span className="font-semibold text-purple-800">Recommendations</span>
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
                                <span className="font-semibold text-purple-800">Questions & Answers</span>
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
                                          <span className="text-xs font-medium text-gray-600">Text</span>
                                        </div>
                                        <p className="text-sm text-gray-800">{res.response.text}</p>
                                      </div>
                                    )}
                                    
                                    {res.response.yesNo !== undefined && (
                                      <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className={`w-2 h-2 rounded-full ${res.response.yesNo ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                          <span className="text-xs font-medium text-gray-600">Answer</span>
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
                                          <span className="text-xs font-medium text-gray-600">Percentage</span>
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
                      {t('reportHistory.noDetails', { defaultValue: 'No details available for this report.' })}
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
                    {t('reportHistory.close', { defaultValue: 'Close' })}
                  </Button>
                  <Button 
                    onClick={() => handleDownloadReport(report.report_id, report.org_name)}
                    className="bg-dgrv-blue hover:bg-dgrv-blue-dark"
                  >
                    <Download className="w-4 h-4 mr-2" /> 
                    {t('reportHistory.exportAsPDF', { defaultValue: 'Export as PDF' })}
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
