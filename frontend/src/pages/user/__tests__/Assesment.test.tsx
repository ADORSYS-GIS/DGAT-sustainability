import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Assessment } from "../Assesment";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/user/useAssessment", () => ({
  useAssessment: () => ({
    currentCategoryIndex: 0,
    answers: {},
    showPercentInfo: false,
    setShowPercentInfo: vi.fn(),
    hasCreatedAssessment: false,
    creationAttempts: 0,
    pendingSubmissions: [],
    showSuccessModal: false,
    setShowSuccessModal: vi.fn(),
    showCreateModal: false,
    setShowCreateModal: vi.fn(),
    isCreatingAssessment: false,
    toolName: "Tool",
    currentLanguage: "en",
    isOnline: true,
    assessmentDetail: { id: "a1" },
    assessmentLoading: false,
    assessmentsData: { assessments: [] },
    assessmentsLoading: false,
    categories: ["Environmental"],
    currentCategory: "Environmental",
    currentQuestions: [],
    progress: 50,
    isLastCategory: false,
    isOrgUser: true,
    canCreate: false,
    handleSelectAssessment: vi.fn(),
    handleCreateAssessment: vi.fn(),
    submitAssessment: vi.fn(),
    getRevisionKey: vi.fn(),
    handleAnswerChange: vi.fn(),
    handleFileUpload: vi.fn(),
    nextCategory: vi.fn(),
    previousCategory: vi.fn(),
    isCurrentCategoryComplete: vi.fn(() => true),
  }),
}));

vi.mock("@/components/shared/Navbar", () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("@/components/shared/AssessmentSuccessModal", () => ({
  AssessmentSuccessModal: () => <div data-testid="success-modal">Success</div>,
}));

vi.mock("@/components/shared/CreateAssessmentModal", () => ({
  CreateAssessmentModal: () => <div data-testid="create-modal">Create</div>,
}));

vi.mock("@/components/user/Assessment", () => ({
  AssessmentHeader: () => <div data-testid="assessment-header">Header</div>,
  OfflineStatusCard: () => <div data-testid="offline-status">Offline</div>,
  QuestionCard: () => <div data-testid="question-card">Card</div>,
  AssessmentNavigation: () => (
    <div data-testid="assessment-navigation">Nav</div>
  ),
  AssessmentSelectionView: () => (
    <div data-testid="selection-view">Selection</div>
  ),
  LoadingView: () => <div data-testid="loading-view">Loading</div>,
  NoCategoriesView: () => <div data-testid="no-categories">NoCategories</div>,
}));

describe("User Assessment Page", () => {
  it("renders assessment layout when assessmentDetail exists", () => {
    render(<Assessment />);

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-header")).toBeInTheDocument();
    expect(screen.getByTestId("offline-status")).toBeInTheDocument();
    expect(screen.getByTestId("question-card")).toBeInTheDocument();
    expect(screen.getByTestId("assessment-navigation")).toBeInTheDocument();
  });
});
