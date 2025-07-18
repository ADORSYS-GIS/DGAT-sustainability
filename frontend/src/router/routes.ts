import React from "react";
import { Dashboard } from "../pages/user/Dashboard";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import NotFound from "../pages/NotFound";
import Unauthorized from "../pages/user/Unauthorized";
import { ProtectedRoute } from "./ProtectedRoute";
import { Welcome } from "../pages/HomePage";
import { ROLES } from "@/constants/roles";
import { ManageCategories } from "../pages/admin/ManageCategories";
import { ManageQuestions } from "../pages/admin/ManageQuestions";
import { ReviewAssessments } from "../pages/admin/ReviewAssessments";
import { StandardRecommendations } from "../pages/admin/StandardRecommendations";
import { Assessment } from "../pages/user/Assesment";
import { Assessments } from "../pages/user/Assessments";
import { ActionPlan } from "../pages/user/ActionPlan";
import { SubmissionView } from "../pages/user/SubmissionView";
import { ManageOrganizations } from "../pages/admin/ManageOrganizations";
import { ManageUsers } from "../pages/admin/ManageUsers";

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
  { path: "/assessment/sustainability", element: Assessment },
  { path: "/user/assessment/:assessmentId", element: Assessment },
  { path: "/assessments", element: Assessments },
  { path: "/action-plan", element: ActionPlan },
  { path: "/action-plan/:reportId", element: ActionPlan },
  { path: "/submission-view/:submissionId", element: SubmissionView },
  { path: "*", element: NotFound },
  { path: "/unauthorized", element: React.createElement(Unauthorized) },
  { path: "/", element: React.createElement(Welcome) },
  {
    path: "/dashboard",
    element: React.createElement(ProtectedRoute, {
    }),
    children: [{ path: "", element: React.createElement(Dashboard) }],
  },
  {
    path: "/admin/dashboard",
    element: React.createElement(ProtectedRoute, {
    }),
    children: [{ path: "", element: React.createElement(AdminDashboard) }],
  },
  { path: "*", element: React.createElement(NotFound) },
];

export default routes;