import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Download,
  Eye,
  Building2,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Award,
  ArrowLeft,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/hooks/shared/useAuth";
import { useOfflineSyncStatus } from "@/hooks/useOfflineApi";
import { AdminService } from "@/openapi-rq/requests/services.gen";
import type {
  AdminReport,
  AdminSubmissionDetail,
  RecommendationWithStatus,
  AdminSubmissionDetail_content_responses
} from "@/openapi-rq/requests/types.gen";

import FileDisplay from "@/components/shared/FileDisplay";

// Type for file attachments
interface FileAttachment {
  name?: string;
  url?: string;
  type?: string;
  [key: string]: unknown;
}
// Using generated AdminReport type

export const ReportHistory: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useOfflineSyncStatus();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loadReports = React.useCallback(async () => {
    if (!isOnline) {
      toast.error(t('reportHistory.offlineError', { defaultValue: 'Cannot load reports while offline' }));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await AdminService.getAdminReports();
        setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error(t('reportHistory.loadError', { defaultValue: 'Failed to load reports' }));
    } finally {
      setLoading(false);
    }
  }, [isOnline, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

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

  const isAdminReportData = (obj: unknown): obj is { submissions: AdminSubmissionDetail[]; recommendations: RecommendationWithStatus[] } => {
    if (!obj || typeof obj !== 'object') return false;
    const maybe = obj as { submissions?: unknown; recommendations?: unknown };
    return Array.isArray(maybe.submissions) && Array.isArray(maybe.recommendations);
  };

  type NormalizedCategory = {
    name: string;
    responses: Array<{ question_text: string; response: { yesNo?: boolean; percentage?: number; text?: string } }>;
    recommendationText?: string;
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
      const recommendationText = typeof obj.recommendation === 'string' ? (obj.recommendation as string) : undefined;
      if (responses.length > 0 || recommendationText) {
        categories.push({ name: key, responses, recommendationText });
      }
    }
    return categories;
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

      if (isAdminReportData(report.data)) {
        const { exportAllAssessmentsPDF } = await import('@/utils/exportPDF');
        await exportAllAssessmentsPDF(report.data.submissions, report.data.recommendations);
          toast.success(t('reportHistory.downloadSuccess', { defaultValue: 'Report downloaded successfully' }));
        return;
      }
      toast.error(t('reportHistory.downloadError', { defaultValue: 'Failed to download report' }));
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error(t('reportHistory.downloadError', { defaultValue: 'Failed to download report' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 pb-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 pb-8">
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
                                <span className="text-sm text-gray-600">{cat.responses.length} questions</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Generic Category Content */}
                          <div className="p-6 bg-gray-50 space-y-6">
                            {/* Generic Recommendation */}
                            {cat.recommendationText && (
                              <div className="bg-white rounded-lg p-4 border-l-4 border-purple-400">
                                <div className="flex items-center gap-2 mb-2">
                                  <Award className="w-5 h-5 text-purple-600" />
                                  <span className="font-semibold text-purple-800">Recommendation</span>
                                </div>
                                <p className="text-gray-700 leading-relaxed">{cat.recommendationText}</p>
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