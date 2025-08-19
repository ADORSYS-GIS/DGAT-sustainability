import * as React from "react";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { AdminGuide } from "../pages/admin/AdminGuide";
import { ManageCategories } from "../pages/admin/ManageCategories";
import { ManageOrganizations } from "../pages/admin/ManageOrganizations";
import { ManageQuestions } from "../pages/admin/ManageQuestions";
import { ManageUsers } from "../pages/admin/ManageUsers";
import ReviewAssessments from "../pages/admin/ReviewAssessments";
import { StandardRecommendations } from "../pages/admin/StandardRecommendations";
import { Welcome } from "../pages/HomePage";
import NotFound from "../pages/NotFound";
import { ActionPlan } from "../pages/user/ActionPlan";
import { Assessment } from "../pages/user/Assesment";
import { AssessmentList } from "../pages/user/AssessmentList";
import { Assessments } from "../pages/user/Assessments";
import { Dashboard } from "../pages/user/Dashboard";
import { OrgUserManageUsers } from "../pages/user/OrgUserManageUsers";
import { SubmissionView } from "../pages/user/SubmissionView";
import Unauthorized from "../pages/user/Unauthorized";
import { UserGuide } from "../pages/user/UserGuide";
import { ProtectedRoute } from "./ProtectedRoute";

const routes = [
  { path: "/", element: Welcome },
  { path: "/admin/dashboard", element: AdminDashboard },
  { path: "/dashboard", element: Dashboard },
  { path: "/admin/categories", element: ManageCategories },
  { path: "/admin/organizations", element: ManageOrganizations },
  { path: "/admin/users", element: ManageUsers },
  { path: "/admin/questions", element: ManageQuestions },
  { path: "/admin/reviews", element: ReviewAssessments },
  { path: "/admin/recommendations", element: StandardRecommendations },
  { path: "/admin/guide", element: AdminGuide },
  { path: "/assessment/sustainability", element: Assessment },
  { path: "/user/assessment/:assessmentId", element: Assessment },
  { path: "/user/assessment-list", element: AssessmentList },
  { path: "/assessments", element: Assessments },
  { path: "/action-plan", element: ActionPlan },
  { path: "/action-plan/:reportId", element: ActionPlan },
  { path: "/submission-view/:submissionId", element: SubmissionView },
  { path: "/user/manage-users", element: OrgUserManageUsers },
  { path: "/user/guide", element: UserGuide },
  { path: "*", element: NotFound },
  { path: "/unauthorized", element: React.createElement(Unauthorized) },
  { path: "/", element: React.createElement(Welcome) },
  {
    path: "/dashboard",
    element: React.createElement(ProtectedRoute, {}),
    children: [{ path: "", element: React.createElement(Dashboard) }],
  },
  {
    path: "/admin/dashboard",
    element: React.createElement(ProtectedRoute, {}),
    children: [{ path: "", element: React.createElement(AdminDashboard) }],
  },
  { path: "*", element: React.createElement(NotFound) },
];

export default routes;
