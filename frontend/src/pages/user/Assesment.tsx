/*
 * Main assessment taking page for users to complete sustainability assessments
 * Provides question interface, navigation, and submission functionality
 */

import { AssessmentSuccessModal } from "@/components/shared/AssessmentSuccessModal";
import { CreateAssessmentModal } from "@/components/shared/CreateAssessmentModal";
import { Navbar } from "@/components/shared/Navbar";
import {
  AssessmentHeader,
  AssessmentNavigation,
  AssessmentSelectionView,
  LoadingView,
  NoCategoriesView,
  OfflineStatusCard,
  QuestionCard,
} from "@/components/user/Assessment";
import { useAssessment } from "@/hooks/user/useAssessment";
import * as React from "react";
import { useNavigate } from "react-router-dom";

export const Assessment: React.FC = () => {
  const navigate = useNavigate();
  const {
    // State
    currentCategoryIndex,
    answers,
    showPercentInfo,
    setShowPercentInfo,
    hasCreatedAssessment,
    creationAttempts,
    pendingSubmissions,
    showSuccessModal,
    setShowSuccessModal,
    showCreateModal,
    setShowCreateModal,
    isCreatingAssessment,
    toolName,
    currentLanguage,
    isOnline,

    // Data
    assessmentDetail,
    assessmentLoading,
    assessmentsData,
    assessmentsLoading,

    // Computed values
    categories,
    currentCategory,
    currentQuestions,
    progress,
    isLastCategory,
    isOrgUser,
    canCreate,

    // Functions
    handleSelectAssessment,
    handleCreateAssessment,
    submitAssessment,
    getRevisionKey,
    handleAnswerChange,
    handleFileUpload,
    nextCategory,
    previousCategory,
    isCurrentCategoryComplete,
  } = useAssessment();

  // Check if we have any categories - only show this message for Org_User, not org_admin
  if (categories.length === 0 && isOrgUser) {
    return (
      <NoCategoriesView onBackToDashboard={() => navigate("/dashboard")} />
    );
  }

  // Show assessment list if no specific assessment is selected
  if (!assessmentDetail) {
    return (
      <AssessmentSelectionView
        assessments={assessmentsData?.assessments || []}
        assessmentsLoading={assessmentsLoading}
        canCreate={canCreate}
        showCreateModal={showCreateModal}
        isCreatingAssessment={isCreatingAssessment}
        onSelectAssessment={handleSelectAssessment}
        onCreateClick={() => setShowCreateModal(true)}
        onCloseCreateModal={() => setShowCreateModal(false)}
        onSubmitCreate={handleCreateAssessment}
      />
    );
  }

  // Show loading for temporary assessment creation
  if (hasCreatedAssessment && !assessmentDetail) {
    return (
      <>
        <LoadingView creationAttempts={creationAttempts} isCreating={true} />
        <AssessmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onReturnToDashboard={() => {
            setShowSuccessModal(false);
            navigate("/dashboard");
          }}
        />
      </>
    );
  }

  // Show loading for assessment loading
  if (assessmentLoading || !assessmentDetail) {
    return (
      <>
        <LoadingView />
        <AssessmentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          onReturnToDashboard={() => {
            setShowSuccessModal(false);
            navigate("/dashboard");
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AssessmentHeader
          toolName={toolName}
          currentCategoryIndex={currentCategoryIndex}
          categoriesLength={categories.length}
          currentCategory={currentCategory}
          progress={progress}
        />

        <OfflineStatusCard
          isOnline={isOnline}
          pendingSubmissions={pendingSubmissions}
        />

        <QuestionCard
          currentCategory={currentCategory}
          currentQuestions={currentQuestions}
          answers={answers}
          onAnswerChange={handleAnswerChange}
          onFileUpload={handleFileUpload}
          showPercentInfo={showPercentInfo}
          setShowPercentInfo={setShowPercentInfo}
          getRevisionKey={getRevisionKey}
          currentLanguage={currentLanguage}
        />

        <AssessmentNavigation
          currentCategoryIndex={currentCategoryIndex}
          isLastCategory={isLastCategory}
          isCurrentCategoryComplete={isCurrentCategoryComplete()}
          onPrevious={previousCategory}
          onNext={nextCategory}
          onSubmit={submitAssessment}
        />
      </div>

      <AssessmentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onReturnToDashboard={() => {
          setShowSuccessModal(false);
          navigate("/dashboard");
        }}
      />

      <CreateAssessmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateAssessment}
        isLoading={isCreatingAssessment}
      />
    </div>
  );
};
