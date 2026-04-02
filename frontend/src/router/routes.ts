import * as React from "react";
const Dashboard = React.lazy(() => import("../pages/user/Dashboard").then((m) => ({ default: m.Dashboard })));
const AdminDashboard = React.lazy(() => import("../pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const NotFound = React.lazy(() => import("../pages/NotFound").then((m) => ({ default: m.default })));
const Unauthorized = React.lazy(() => import("../pages/user/Unauthorized").then((m) => ({ default: m.default })));
import { ProtectedRoute } from "./ProtectedRoute";
const Welcome = React.lazy(() => import("../pages/HomePage").then((m) => ({ default: m.Welcome })));
import { ROLES } from "@/constants/roles";
const ManageCategories = React.lazy(() => import("../pages/admin/ManageCategories").then((m) => ({ default: m.ManageCategories })));
const ManageQuestions = React.lazy(() => import("../pages/admin/ManageQuestions").then((m) => ({ default: m.ManageQuestions })));
const ReviewAssessments = React.lazy(() => import("../pages/user/ReviewAssessments").then((m) => ({ default: m.default })));
const AdminActionPlans = React.lazy(() => import("../pages/admin/AdminActionPlans").then((m) => ({ default: m.default })));
const Assessment = React.lazy(() => import("../pages/user/Assessment").then((m) => ({ default: m.Assessment })));
const AssessmentList = React.lazy(() => import("../pages/user/AssessmentList").then((m) => ({ default: m.AssessmentList })));
const Assessments = React.lazy(() => import("../pages/user/Assessments").then((m) => ({ default: m.Assessments })));
const ActionPlan = React.lazy(() => import("../pages/user/ActionPlan").then((m) => ({ default: m.ActionPlan })));
const SubmissionView = React.lazy(() => import("../pages/user/SubmissionView").then((m) => ({ default: m.SubmissionView })));
const ManageOrganizations = React.lazy(() => import("../pages/admin/ManageOrganizations").then((m) => ({ default: m.ManageOrganizations })));
const ManageUsers = React.lazy(() => import("../pages/admin/ManageUsers").then((m) => ({ default: m.ManageUsers })));
const OrgUserManageUsers = React.lazy(() => import("../pages/user/OrgUserManageUsers").then((m) => ({ default: m.OrgUserManageUsers })));
const AdminGuide = React.lazy(() => import("../pages/admin/AdminGuide").then((m) => ({ default: m.AdminGuide })));
const UserGuide = React.lazy(() => import("../pages/user/UserGuide").then((m) => ({ default: m.UserGuide })));
const DraftSubmissions = React.lazy(() => import("../pages/user/DraftSubmissions").then((m) => ({ default: m.default })));
const ReportHistory = React.lazy(() => import("../pages/admin/ReportHistory").then((m) => ({ default: m.ReportHistory })));
const AssessmentSubmissionsList = React.lazy(() => import("@/pages/user/AssessmentSubmissionsList").then((m) => ({ default: m.AssessmentSubmissionsList })));

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
      { path: "action-plans", element: React.createElement(AdminActionPlans) },
      { path: "report-history", element: React.createElement(ReportHistory) },
      { path: "guide", element: React.createElement(AdminGuide) },
    ],
  },

  // User routes - require org_admin or Org_User role
  {
    path: "/dashboard",
    element: React.createElement(ProtectedRoute, { 
      allowedRoles: [ROLES.ORG_ADMIN, ROLES.Org_User],
      requireOrganization: true,
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
      { path: "draft-submissions", element: React.createElement(DraftSubmissions) },
      { path: "assessment-submissions", element: React.createElement(AssessmentSubmissionsList) },
      { path: "manage-users", element: React.createElement(OrgUserManageUsers) },
      { path: "guide", element: React.createElement(UserGuide) },
      { path: "reviews", element: React.createElement(ReviewAssessments) },
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
      { path: "submission/:submissionId", element: React.createElement(ActionPlan) },
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
