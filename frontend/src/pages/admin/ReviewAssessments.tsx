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
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  AlertTriangle,
  ArrowLeft,
  Send,
  Wifi,
  WifiOff
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

interface ReviewComment {
  questionId: string;
  comment: string;
  reviewer: string;
  timestamp: Date;
}

interface CategoryRecommendation {
  category: string;
  recommendation: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionDetail | null>(null);
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);
  const [categoryRecommendations, setCategoryRecommendations] = useState<CategoryRecommendation[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentComment, setCurrentComment] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewSubmission[]>([]);

  // Use offline hooks
  const { data: submissionsData, isLoading: submissionsLoading, error: submissionsError, refetch: refetchSubmissions } = useOfflineAdminSubmissions();
  const { isOnline } = useOfflineSyncStatus();

  // Load pending reviews from IndexedDB
  useEffect(() => {
    const loadPendingReviews = async () => {
      try {
        const pending = await offlineDB.getPendingReviewSubmissions();
        setPendingReviews(pending);
      } catch (error) {
        console.error('Failed to load pending reviews:', error);
      }
    };
    loadPendingReviews();
  }, []);

  // Sync pending reviews when online
  useEffect(() => {
    if (isOnline && pendingReviews.length > 0) {
      syncPendingReviews();
    }
  }, [isOnline, pendingReviews.length]);

  const syncPendingReviews = async () => {
    for (const pendingReview of pendingReviews) {
      if (pendingReview.syncStatus === 'pending') {
        try {
          console.log('🔄 Syncing pending review:', pendingReview.id);
          
          const result = await ReportsService.postSubmissionsBySubmissionIdReports({
            submissionId: pendingReview.submissionId,
            requestBody: pendingReview.categoryRecommendations
          });

          console.log('✅ Review synced successfully:', result);
          
          // Mark as synced in IndexedDB
          await offlineDB.updatePendingReviewSubmission(pendingReview.id, 'synced');
          
          // Remove from pending list
          setPendingReviews(prev => prev.filter(r => r.id !== pendingReview.id));
          
          toast.success(`Review for submission ${pendingReview.submissionId} synced successfully`);
        } catch (error) {
          console.error('❌ Failed to sync review:', error);
          toast.error(`Failed to sync review for submission ${pendingReview.submissionId}`);
        }
      }
    }
  };

  // Filter submissions for review
  const submissionsForReview = submissionsData?.submissions?.filter(
    submission => submission.review_status === 'under_review'
  ) || [];

  // Get responses from the selected submission (they're already included in the submission data)
  const submissionResponses = selectedSubmission?.content?.responses || [];

  // Add debugging
  React.useEffect(() => {
    console.log('🔍 ReviewAssessments: All submissions data:', submissionsData);
    console.log('🔍 ReviewAssessments: All submissions:', submissionsData?.submissions);
    console.log('🔍 ReviewAssessments: Submissions for review:', submissionsForReview);
    console.log('🔍 ReviewAssessments: Submission statuses:', submissionsData?.submissions?.map(s => ({ 
      id: s.submission_id, 
      status: s.review_status,
      user_id: s.user_id,
      submitted_at: s.submitted_at
    })));
  }, [submissionsData, submissionsForReview]);

  useEffect(() => {
    if (selectedSubmission) {
      // No need to refetch responses here as they are part of selectedSubmission.content.responses
    }
  }, [selectedSubmission]);

  const handleReviewSubmission = (submission: AdminSubmissionDetail) => {
    setSelectedSubmission(submission);
    setReviewComments([]);
    setCategoryRecommendations([]);
    setIsReviewDialogOpen(true);
  };

  const addReviewComment = () => {
    if (!currentComment.trim() || !selectedQuestionId) return;

    const newComment: ReviewComment = {
      questionId: selectedQuestionId,
      comment: currentComment,
      reviewer: user?.email || 'Unknown',
      timestamp: new Date()
    };

    setReviewComments([...reviewComments, newComment]);
    setCurrentComment('');
    setSelectedQuestionId('');
  };

  const removeReviewComment = (index: number) => {
    setReviewComments(reviewComments.filter((_, i) => i !== index));
  };

  const addCategoryRecommendation = (category: string, recommendation: string) => {
    if (!recommendation.trim()) return;

    const newRecommendation: CategoryRecommendation = {
      category,
      recommendation
    };

    // Remove existing recommendation for this category if it exists
    const filtered = categoryRecommendations.filter(r => r.category !== category);
    setCategoryRecommendations([...filtered, newRecommendation]);
  };

  const removeCategoryRecommendation = (category: string) => {
    setCategoryRecommendations(categoryRecommendations.filter(r => r.category !== category));
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;

    try {
      setIsSubmitting(true);

      console.log('🔍 Submitting review for submission:', selectedSubmission.submission_id);
      console.log('🔍 Category recommendations:', categoryRecommendations);

      if (isOnline) {
        // Online: Submit directly to server
        const result = await ReportsService.postSubmissionsBySubmissionIdReports({
          submissionId: selectedSubmission.submission_id,
          requestBody: categoryRecommendations
        });

        console.log('🔍 Review submission result:', result);
        toast.success('Review submitted successfully');
      } else {
        // Offline: Store locally for later sync
        const pendingReview: PendingReviewSubmission = {
          id: `pending_${Date.now()}_${Math.random()}`,
          submissionId: selectedSubmission.submission_id,
          categoryRecommendations,
          reviewer: user?.email || 'Unknown',
          timestamp: new Date(),
          syncStatus: 'pending'
        };

        await offlineDB.savePendingReviewSubmission(pendingReview);
        setPendingReviews(prev => [...prev, pendingReview]);
        
        toast.success('Review saved locally. Will sync when online.');
      }

      setIsReviewDialogOpen(false);
      setSelectedSubmission(null);
      setCategoryRecommendations([]);
      refetchSubmissions();
    } catch (error) {
      console.error('❌ Failed to submit review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'under_review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (submissionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading submissions...</p>
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
            <p className="text-red-600">Error loading submissions</p>
            <Button onClick={() => refetchSubmissions()} className="mt-2">
              Retry
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
            <span>Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Assessments</h1>
            <p className="text-gray-600">Review and approve submitted assessments</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-4">
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
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Pending Reviews Indicator */}
          {pendingReviews.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              <Clock className="w-4 h-4" />
              <span>{pendingReviews.length} Pending Sync</span>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Submissions Under Review ({submissionsForReview.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsForReview.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No submissions under review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissionsForReview.map((submission) => (
                <div key={submission.submission_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Submission {submission.submission_id}</h3>
                      <p className="text-sm text-gray-600">User: {submission.user_id}</p>
                      <p className="text-sm text-gray-600">
                        Submitted: {submission.submitted_at 
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : 'Unknown'
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
                        <span>Review</span>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Review Assessment</span>
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Submission Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Submission ID</label>
                      <p className="text-gray-900">{selectedSubmission.submission_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">User ID</label>
                      <p className="text-gray-900">{selectedSubmission.user_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Submission Date</label>
                      <p className="text-gray-900">
                        {selectedSubmission.submitted_at 
                          ? new Date(selectedSubmission.submitted_at).toLocaleString()
                          : 'Unknown'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedSubmission.review_status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Responses */}
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissionResponses.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-600">No responses found</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Group responses by category */}
                      {(() => {
                        const categories = [...new Set(submissionResponses.map(r => r.question_category))];
                        return categories.map(category => {
                          const categoryResponses = submissionResponses.filter(r => r.question_category === category);
                          const categoryRecommendation = categoryRecommendations.find(r => r.category === category);
                          
                          return (
                            <div key={category} className="border rounded-lg p-4 bg-gray-50">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                  {category} Category
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {categoryRecommendation && (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      ✓ Recommendation Added
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedQuestionId(category)}
                                    className="flex items-center space-x-1"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Add Recommendation</span>
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Category recommendation display */}
                              {categoryRecommendation && (
                                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                  <p className="text-sm font-medium text-gray-900 mb-1">Your Recommendation:</p>
                                  <p className="text-sm text-gray-700">{categoryRecommendation.recommendation}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeCategoryRecommendation(category)}
                                    className="mt-2 text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                              
                              {/* Questions in this category */}
                              <div className="space-y-3">
                                {categoryResponses.map((response, index) => {
                                  // Parse the response JSON to get the actual response data
                                  let responseData;
                                  try {
                                    responseData = JSON.parse(response.response);
                                  } catch (e) {
                                    responseData = { text: response.response };
                                  }
                                  
                                  return (
                                    <div key={index} className="bg-white p-3 rounded border">
                                      <h4 className="font-medium text-gray-900 mb-2">
                                        {response.question_text}
                                      </h4>
                                      
                                      {/* Display response data */}
                                      <div className="bg-gray-50 p-3 rounded">
                                        {responseData.yesNo !== undefined && (
                                          <p className="text-sm text-gray-700 mb-1">
                                            <span className="font-medium">Yes/No:</span> {responseData.yesNo ? 'Yes' : 'No'}
                                          </p>
                                        )}
                                        {responseData.percentage !== undefined && (
                                          <p className="text-sm text-gray-700 mb-1">
                                            <span className="font-medium">Percentage:</span> {responseData.percentage}%
                                          </p>
                                        )}
                                        {responseData.text && (
                                          <p className="text-sm text-gray-700">
                                            <span className="font-medium">Response:</span> {responseData.text}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Recommendation Section */}
              {selectedQuestionId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add Recommendation for {selectedQuestionId} Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Recommendation
                        </label>
                        <Textarea
                          value={currentComment}
                          onChange={(e) => setCurrentComment(e.target.value)}
                          placeholder="Enter your recommendation for this category..."
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => addCategoryRecommendation(selectedQuestionId, currentComment)}
                          disabled={!currentComment.trim()}
                          className="flex items-center space-x-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>Add Recommendation</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedQuestionId('');
                            setCurrentComment('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || categoryRecommendations.length === 0}
                  className="flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Review</span>
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
