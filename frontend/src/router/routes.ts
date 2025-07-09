import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { Dashboard } from "../pages/user/Dashboard";
import { Welcome } from "../pages/HomePage";
import NotFound from "../pages/NotFound";
import { ManageCategories } from "../pages/admin/ManageCategories";
import { ManageQuestions } from "../pages/admin/ManageQuestions";
import { ReviewAssessments } from "../pages/admin/ReviewAssessments";
import { StandardRecommendations } from "../pages/admin/StandardRecommendations";
import { Assessment } from "../pages/user/Assessment";
import { Assessments } from "../pages/user/Assessments";
import { ActionPlan } from "../pages/user/ActionPlan";

const routes = [
  { path: "/", element: Welcome },
  { path: "/dashboard", element: Dashboard },
  { path: "/admin/dashboard", element: AdminDashboard },
  { path: "/admin/categories", element: ManageCategories },
  { path: "/admin/questions", element: ManageQuestions },
  { path: "/admin/reviews", element: ReviewAssessments },
  { path: "/admin/recommendations", element: StandardRecommendations },
  { path: "/dashboard", element: Dashboard },
  { path: "/assessment/sustainability", element: Assessment },
  { path: "/assessments", element: Assessments },
  { path: "/action-plan", element: ActionPlan },
  { path: "*", element: NotFound },
];

export default routes;
