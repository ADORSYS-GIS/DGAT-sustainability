import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Send,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/shared/useAuth';
import { 
  useOfflineAdminSubmissions, 
  useOfflineSyncStatus 
} from '@/hooks/useOfflineApi';
import { ReportsService } from '@/openapi-rq/requests/services.gen';
import { AdminSubmissionDetail } from '@/openapi-rq/requests/types.gen';
import { offlineDB } from '@/services/indexeddb';
import { useTranslation } from 'react-i18next';

interface CategoryRecommendation {
  id: string;
  category: string;
  recommendation: string;
  timestamp: Date;
}

interface PendingReviewSubmission {
  id: string;
  submissionId: string;
  categoryRecommendations: CategoryRecommendation[];
  reviewer: string;
  timestamp: Date;
  syncStatus: 'pending' | 'synced';
}

const ReviewAssessments: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionDetail | null>(null);
  const [categoryRecommendations, setCategoryRecommendations] = useState<CategoryRecommendation[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState('');
  const [isAddingRecommendation, setIsAddingRecommendation] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewSubmission[]>([]);

  // Use offline hooks
  const { data: submissionsData, isLoading: submissionsLoading, error: submissionsError, refetch: refetchSubmissions } = useOfflineAdminSubmissions();
  const { isOnline } = useOfflineSyncStatus();

  // Load pending reviews from IndexedDB
  useEffect(() => {
    const loadPendingReviews = async () => {
      try {
        const pendingReviews = await offlineDB.getAllPendingReviewSubmissions();
        setPendingReviews(pendingReviews);
      } catch (error) {
        console.error('Failed to load pending reviews:', error);
      }
    };
    loadPendingReviews();
  }, []);

  // Filter submissions for review
  const submissionsForReview = submissionsData?.submissions?.filter(
    submission => submission.review_status === 'under_review'
  ) || [];

  // Get responses from the selected submission (they're already included in the submission data)
  const submissionResponses = selectedSubmission?.content?.responses || [];

  // Listen for sync completion and update pending reviews
  React.useEffect(() => {
    const handleSyncComplete = async () => {
      // Check if any pending reviews should be marked as synced
      const allPendingReviews = await offlineDB.getAllPendingReviewSubmissions();
      const pendingReviews = allPendingReviews.filter(r => r.syncStatus === 'pending');
      
      if (pendingReviews.length > 0) {
        // Mark them as synced since the sync queue has been processed
        for (const review of pendingReviews) {
          await offlineDB.updatePendingReviewSubmission(review.id, 'synced');
        }
        
        // Update the local state
        setPendingReviews(prev => prev.map(r => ({ ...r, syncStatus: 'synced' as const })));
      }
    };

    // Listen for online events which trigger sync
    window.addEventListener('online', handleSyncComplete);
    
    return () => {
      window.removeEventListener('online', handleSyncComplete);
    };
  }, []);

  useEffect(() => {
    if (selectedSubmission) {
      // No need to refetch responses here as they are part of selectedSubmission.content.responses
    }
  }, [selectedSubmission]);

  const handleReviewSubmission = (submission: AdminSubmissionDetail) => {
    setSelectedSubmission(submission);
    setCategoryRecommendations([]);
    setIsReviewDialogOpen(true);
  };

  const addCategoryRecommendation = (category: string, recommendation: string) => {
    if (!recommendation.trim()) return;

    const newRecommendation: CategoryRecommendation = {
      id: `rec_${Date.now()}_${Math.random()}`,
      category,
      recommendation,
      timestamp: new Date()
    };

    // Add the new recommendation to the existing list (don't filter out existing ones)
    setCategoryRecommendations([...categoryRecommendations, newRecommendation]);
  };

  const removeCategoryRecommendation = (id: string) => {
    setCategoryRecommendations(categoryRecommendations.filter(r => r.id !== id));
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission || categoryRecommendations.length === 0) {
      toast.error(t('reviewAssessments.pleaseAddRecommendations', { defaultValue: 'Please add at least one recommendation' }));
      return;
    }

    setIsSubmitting(true);

    try {
      // Create pending review for UI
      const pendingReview: PendingReviewSubmission = {
        id: crypto.randomUUID(),
        submissionId: selectedSubmission.submission_id,
        categoryRecommendations,
        reviewer: user?.email || 'Unknown',
        timestamp: new Date(),
        syncStatus: 'pending'
      };

      setPendingReviews(prev => [...prev, pendingReview]);

      // Use the OpenAPI-generated service directly
      const result = await ReportsService.postSubmissionsBySubmissionIdReports({
        submissionId: selectedSubmission.submission_id,
        requestBody: categoryRecommendations.map(rec => ({
          category: rec.category,
          recommendation: rec.recommendation
        }))
      });

      console.log('✅ Report generation successful:', result.report_id);
      
      // Update the pending review status
      setPendingReviews(prev => 
        prev.map(review => 
          review.submissionId === selectedSubmission.submission_id 
            ? { ...review, syncStatus: 'synced' as const }
            : review
        )
      );

      toast.success(t('reviewAssessments.reviewSubmitted', { defaultValue: 'Review submitted successfully' }));

      setIsReviewDialogOpen(false);
      setSelectedSubmission(null);
      setCategoryRecommendations([]);
      refetchSubmissions();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(t('reviewAssessments.failedToSubmitReview', { defaultValue: 'Failed to submit review' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'under_review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{t('reviewAssessments.underReview', { defaultValue: 'Under Review' })}</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('reviewAssessments.approved', { defaultValue: 'Approved' })}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('reviewAssessments.rejected', { defaultValue: 'Rejected' })}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Manual sync function - now just refreshes data
  const handleManualSync = async () => {
    try {
      await refetchSubmissions(); // Refresh the submissions list
    } catch (error) {
      console.error(t('reviewAssessments.manualSyncFailed', { defaultValue: 'Manual sync failed:' }), error);
    }
  };

  if (submissionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('reviewAssessments.loadingSubmissions', { defaultValue: 'Loading submissions...' })}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submissionsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{t('reviewAssessments.errorLoadingSubmissions', { defaultValue: 'Error loading submissions' })}</p>
            <Button onClick={() => refetchSubmissions()} className="mt-2">
              {t('reviewAssessments.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('reviewAssessments.backToDashboard', { defaultValue: 'Back to Dashboard' })}</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reviewAssessments.title', { defaultValue: 'Review Assessments' })}</h1>
            <p className="text-gray-600">{t('reviewAssessments.subtitle', { defaultValue: 'Review and approve submitted assessments' })}</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4">
          {/* Manual Sync Button */}
          <Button 
            onClick={handleManualSync}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('reviewAssessments.syncData', { defaultValue: 'Sync Data' })}</span>
          </Button>

          {/* Offline/Online Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{isOnline ? t('common.online', { defaultValue: 'Online' }) : t('common.offline', { defaultValue: 'Offline' })}</span>
          </div>

          {/* Pending Reviews Indicator */}
          {pendingReviews.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              <Clock className="w-4 h-4" />
              <span>{pendingReviews.length} {t('reviewAssessments.pendingSync', { defaultValue: 'Pending Sync' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{t('reviewAssessments.submissionsUnderReview', { defaultValue: 'Submissions Under Review' })} ({submissionsForReview.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsForReview.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('reviewAssessments.noSubmissionsUnderReview', { defaultValue: 'No submissions under review' })}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissionsForReview.map((submission) => (
                <div key={submission.submission_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{submission.org_name || t('reviewAssessments.unknownOrganization', { defaultValue: 'Unknown Organization' })}</h3>
                      <p className="text-sm text-gray-600">{t('reviewAssessments.organization', { defaultValue: 'Organization' })}: {submission.org_name || t('reviewAssessments.unknown', { defaultValue: 'Unknown' })}</p>
                      <p className="text-sm text-gray-600">
                        {t('reviewAssessments.submitted', { defaultValue: 'Submitted' })}: {submission.submitted_at 
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : t('reviewAssessments.unknown', { defaultValue: 'Unknown' })
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div>{getStatusBadge(submission.review_status)}</div>
                      <Button
                        size="sm"
                        onClick={() => handleReviewSubmission(submission)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{t('reviewAssessments.review', { defaultValue: 'Review' })}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center space-x-3 text-2xl font-bold text-gray-900">
              <Award className="w-6 h-6 text-blue-600" />
              <span>{t('reviewAssessments.reviewAssessment', { defaultValue: 'Review Assessment' })}</span>
            </DialogTitle>
            <p className="text-gray-600 mt-2">{t('reviewAssessments.reviewDescription', { defaultValue: 'Review and provide recommendations for this sustainability assessment' })}</p>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Info */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span>{t('reviewAssessments.submissionDetails', { defaultValue: 'Submission Details' })}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('reviewAssessments.organization', { defaultValue: 'Organization' })}</label>
                      <p className="text-sm font-mono text-gray-900 mt-1">{selectedSubmission.org_name || selectedSubmission.submission_id}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('reviewAssessments.organization', { defaultValue: 'Organization' })}</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedSubmission.org_name || t('reviewAssessments.unknown', { defaultValue: 'Unknown' })}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('reviewAssessments.submissionDate', { defaultValue: 'Submission Date' })}</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedSubmission.submitted_at 
                          ? new Date(selectedSubmission.submitted_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : t('reviewAssessments.unknown', { defaultValue: 'Unknown' })
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('reviewAssessments.status', { defaultValue: 'Status' })}</label>
                      <div className="mt-1">{getStatusBadge(selectedSubmission.review_status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Responses */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <span>{t('reviewAssessments.assessmentResponses', { defaultValue: 'Assessment Responses' })}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {submissionResponses.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">{t('reviewAssessments.noResponsesFound', { defaultValue: 'No responses found' })}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Group responses by category */}
                      {(() => {
                        const categories = [...new Set(submissionResponses.map(r => r.question_category))];
                        return categories.map(category => {
                          const categoryResponses = submissionResponses.filter(r => r.question_category === category);
                          const recsForCategory = categoryRecommendations.filter(r => r.category === category);
                          
                          return (
                            <div key={category} className="border rounded-xl p-6 bg-gradient-to-r from-gray-50 to-white shadow-sm">
                              <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-600">
                                      {category.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <h3 className="text-xl font-semibold text-gray-900 capitalize">
                                    {category} Category
                                  </h3>
                                  <span className="text-sm text-gray-500">
                                    ({categoryResponses.length} questions)
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  {recsForCategory.length > 0 && (
                                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {recsForCategory.length} Recommendation{recsForCategory.length > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsAddingRecommendation(category);
                                      setCurrentComment('');
                                    }}
                                    className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>{t('reviewAssessments.addRecommendation', { defaultValue: 'Add Recommendation' })}</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedCategories);
                                      if (newExpanded.has(category)) {
                                        newExpanded.delete(category);
                                      } else {
                                        newExpanded.add(category);
                                      }
                                      setExpandedCategories(newExpanded);
                                    }}
                                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                                  >
                                    {expandedCategories.has(category) ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                    <span className="text-sm">
                                      {expandedCategories.has(category) ? t('reviewAssessments.collapse', { defaultValue: 'Collapse' }) : t('reviewAssessments.expand', { defaultValue: 'Expand' })}
                                    </span>
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Category recommendation display */}
                              {recsForCategory.length > 0 && (
                                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-3">
                                    <Award className="w-4 h-4 text-blue-600" />
                                    <p className="text-sm font-medium text-gray-900">{t('reviewAssessments.yourRecommendations', { defaultValue: 'Your Recommendations:' })}</p>
                                  </div>
                                  <div className="space-y-3">
                                    {recsForCategory.map(rec => (
                                      <div key={rec.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-700">{rec.recommendation}</p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {t('reviewAssessments.addedAt', { defaultValue: 'Added at' })} {rec.timestamp.toLocaleTimeString()}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => removeCategoryRecommendation(rec.id)}
                                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Add Recommendation Form for this category */}
                              {isAddingRecommendation === category && (
                                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-3">
                                    <Plus className="w-4 h-4 text-green-600" />
                                    <p className="text-sm font-medium text-gray-900">{t('reviewAssessments.addRecommendationFor', { defaultValue: 'Add Recommendation for' })} {category}</p>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        {t('reviewAssessments.recommendation', { defaultValue: 'Recommendation' })}
                                      </label>
                                      <Textarea
                                        value={currentComment}
                                        onChange={(e) => setCurrentComment(e.target.value)}
                                        placeholder={`${t('reviewAssessments.enterRecommendationFor', { defaultValue: 'Enter your recommendation for' })} ${category} ${t('reviewAssessments.category', { defaultValue: 'category' })}...`}
                                        className="min-h-[100px] resize-none border-gray-300 focus:border-green-500 focus:ring-green-500"
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex space-x-3">
                                      <Button
                                        onClick={() => {
                                          if (currentComment.trim()) {
                                            addCategoryRecommendation(category, currentComment);
                                            setCurrentComment('');
                                            setIsAddingRecommendation('');
                                          }
                                        }}
                                        disabled={!currentComment.trim()}
                                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>{t('reviewAssessments.addRecommendation', { defaultValue: 'Add Recommendation' })}</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setCurrentComment('');
                                          setIsAddingRecommendation('');
                                        }}
                                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                      >
                                        {t('reviewAssessments.cancel', { defaultValue: 'Cancel' })}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Questions in this category - Collapsible */}
                              {expandedCategories.has(category) ? (
                                <div className="space-y-4">
                                  {categoryResponses.map((response, index) => {
                                    // Parse the response JSON to get the actual response data
                                    let responseData;
                                    try {
                                      responseData = JSON.parse(response.response);
                                    } catch (e) {
                                      responseData = { text: response.response };
                                    }
                                    
                                    return (
                                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <h4 className="font-medium text-gray-900 mb-3 text-lg">
                                          {response.question_text}
                                        </h4>
                                        
                                        {/* Display response data */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                          {responseData.yesNo !== undefined && (
                                            <div className="flex items-center space-x-2 mb-2">
                                              <span className="text-sm font-medium text-gray-700">{t('reviewAssessments.yesNo', { defaultValue: 'Yes/No:' })}</span>
                                              <Badge variant={responseData.yesNo ? "default" : "secondary"} className={responseData.yesNo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                {responseData.yesNo ? t('reviewAssessments.yes', { defaultValue: 'Yes' }) : t('reviewAssessments.no', { defaultValue: 'No' })}
                                              </Badge>
                                            </div>
                                          )}
                                          {responseData.percentage !== undefined && (
                                            <div className="flex items-center space-x-2 mb-2">
                                              <span className="text-sm font-medium text-gray-700">{t('reviewAssessments.percentage', { defaultValue: 'Percentage:' })}</span>
                                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {responseData.percentage}%
                                              </Badge>
                                            </div>
                                          )}
                                          {responseData.text && (
                                            <div className="mt-3">
                                              <span className="text-sm font-medium text-gray-700">{t('reviewAssessments.response', { defaultValue: 'Response:' })}</span>
                                              <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded border">
                                                {responseData.text}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <p className="text-sm">{t('reviewAssessments.clickExpandToView', { defaultValue: 'Click "Expand" to view' })} {categoryResponses.length} {t('reviewAssessments.question', { defaultValue: 'question' })}{categoryResponses.length !== 1 ? 's' : ''}</p>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  disabled={isSubmitting}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('reviewAssessments.cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || categoryRecommendations.length === 0}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('reviewAssessments.submitReview', { defaultValue: 'Submit Review' })}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewAssessments;
