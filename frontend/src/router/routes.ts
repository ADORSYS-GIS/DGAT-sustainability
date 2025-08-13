import * as React from "react";
import { Dashboard } from "../pages/user/Dashboard";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import NotFound from "../pages/NotFound";
import Unauthorized from "../pages/user/Unauthorized";
import { ProtectedRoute } from "./ProtectedRoute";
import { Welcome } from "../pages/HomePage";
import { ROLES } from "@/constants/roles";
import { ManageCategories } from "../pages/admin/ManageCategories";
import { ManageQuestions } from "../pages/admin/ManageQuestions";
import ReviewAssessments from "../pages/admin/ReviewAssessments";
import { StandardRecommendations } from "../pages/admin/StandardRecommendations";
import { Assessment } from "../pages/user/Assesment";
import { AssessmentList } from "../pages/user/AssessmentList";
import { Assessments } from "../pages/user/Assessments";
import { ActionPlan } from "../pages/user/ActionPlan";
import { SubmissionView } from "../pages/user/SubmissionView";
import { ManageOrganizations } from "../pages/admin/ManageOrganizations";
import { ManageUsers } from "../pages/admin/ManageUsers";
import { OrgUserManageUsers } from "../pages/user/OrgUserManageUsers";
import { AdminGuide } from "../pages/admin/AdminGuide";
import { UserGuide } from "../pages/user/UserGuide";

const routes = [
  // Public routes
  { path: "/", element: React.createElement(Welcome) },
  { path: "/unauthorized", element: React.createElement(Unauthorized) },
  
  // Admin routes - require DGRV_Admin role
  {
    path: "/admin",
    element: React.createElement(ProtectedRoute, { allowedRoles: [ROLES.ADMIN] }),
    children: [
      { path: "dashboard", element: React.createElement(AdminDashboard) },
      { path: "categories", element: React.createElement(ManageCategories) },
      { path: "organizations", element: React.createElement(ManageOrganizations) },
      { path: "users", element: React.createElement(ManageUsers) },
      { path: "questions", element: React.createElement(ManageQuestions) },
      { path: "reviews", element: React.createElement(ReviewAssessments) },
      { path: "recommendations", element: React.createElement(StandardRecommendations) },
      { path: "guide", element: React.createElement(AdminGuide) },
    ],
  },

  // User routes - require org_admin or Org_User role
  {
    path: "/dashboard",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [{ path: "", element: React.createElement(Dashboard) }],
  },

  // Assessment routes - require org_admin or Org_User role
  {
    path: "/assessment",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [
      { path: "sustainability", element: React.createElement(Assessment) },
    ],
  },

  // User assessment routes - require org_admin or Org_User role
  {
    path: "/user",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [
      { path: "assessment/:assessmentId", element: React.createElement(Assessment) },
      { path: "assessment-list", element: React.createElement(AssessmentList) },
      { path: "manage-users", element: React.createElement(OrgUserManageUsers) },
      { path: "guide", element: React.createElement(UserGuide) },
    ],
  },

  // Assessment management routes - require org_admin or Org_User role
  {
    path: "/assessments",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [{ path: "", element: React.createElement(Assessments) }],
  },

  // Action plan routes - require org_admin or Org_User role
  {
    path: "/action-plan",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [
      { path: "", element: React.createElement(ActionPlan) },
      { path: ":reportId", element: React.createElement(ActionPlan) },
    ],
  },

  // Submission view routes - require org_admin or Org_User role
  {
    path: "/submission-view",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User] 
    }),
    children: [
      { path: ":submissionId", element: React.createElement(SubmissionView) },
    ],
  },

  // Catch-all route for 404
  { path: "*", element: React.createElement(NotFound) },
];

export default routes;
