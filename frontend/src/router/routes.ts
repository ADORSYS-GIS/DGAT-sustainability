import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { Dashboard } from "../pages/user/Dashboard";
import { Welcome } from "../pages/HomePage";
import NotFound from "../pages/NotFound";
import { Assessment } from "../pages/user/Assessment";

// Example route definitions
const routes = [
  { path: "/", element: Welcome },
  { path: "/admin/dashboard", element: AdminDashboard },
  { path: "/dashboard", element: Dashboard },
  { path: "/assessment/sustainability", element: Assessment },
  // { path: '/login', element: LoginPage },
  { path: "*", element: NotFound },
];

export default routes;
