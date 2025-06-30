import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { Welcome } from "../pages/HomePage";
import NotFound from "../pages/NotFound";
import { ManageCategories } from "../pages/admin/ManageCategories";
import { ManageQuestions } from "../pages/admin/ManageQuestions";
import { ReviewAssessments } from "../pages/admin/ReviewAssessments";
import { StandardRecommendations } from "../pages/admin/StandardRecommendations";

// Example route definitions
const routes = [
  { path: "/", element: Welcome },
  { path: "/admin/dashboard", element: AdminDashboard },
  { path: "/admin/categories", element: ManageCategories },
  { path: "/admin/questions", element: ManageQuestions },
  { path: "/admin/reviews", element: ReviewAssessments },
  { path: "/admin/recommendations", element: StandardRecommendations },
  // { path: '/', element: HomePage },
  // { path: '/login', element: LoginPage },
  { path: "*", element: NotFound },
];

export default routes;
