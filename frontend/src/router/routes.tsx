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
import { OrgUserManageUsers } from "../pages/user/OrgUserManageUsers";
import { AdminGuide } from "../pages/admin/AdminGuide";
import { UserGuide } from "../pages/user/UserGuide";

const routes = [
  { path: "/", element: <Welcome /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  
  // Protected user routes
  {
    path: "/dashboard",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <Dashboard /> }],
  },
  {
    path: "/assessment/sustainability",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <Assessment /> }],
  },
  {
    path: "/user/assessment/:assessmentId",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <Assessment /> }],
  },
  {
    path: "/assessments",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <Assessments /> }],
  },
  {
    path: "/action-plan",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ActionPlan /> }],
  },
  {
    path: "/action-plan/:reportId",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ActionPlan /> }],
  },
  {
    path: "/submission-view/:submissionId",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <SubmissionView /> }],
  },
  {
    path: "/user/manage-users",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <OrgUserManageUsers /> }],
  },
  {
    path: "/user/guide",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <UserGuide /> }],
  },
  
  // Protected admin routes
  {
    path: "/admin/dashboard",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <AdminDashboard /> }],
  },
  {
    path: "/admin/categories",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ManageCategories /> }],
  },
  {
    path: "/admin/organizations",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ManageOrganizations /> }],
  },
  {
    path: "/admin/users",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ManageUsers /> }],
  },
  {
    path: "/admin/questions",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ManageQuestions /> }],
  },
  {
    path: "/admin/reviews",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <ReviewAssessments /> }],
  },
  {
    path: "/admin/recommendations",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <StandardRecommendations /> }],
  },
  {
    path: "/admin/guide",
    element: <ProtectedRoute />,
    children: [{ path: "", element: <AdminGuide /> }],
  },
  
  // Catch-all route
  { path: "*", element: <NotFound /> },
];

export default routes; 