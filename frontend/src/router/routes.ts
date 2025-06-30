import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { Welcome } from "../pages/HomePage";
import NotFound from "../pages/NotFound";

// Example route definitions
const routes = [
  { path: "/", element: Welcome },
  { path: "/admin/dashboard", element: AdminDashboard },
  // { path: '/', element: HomePage },
  // { path: '/login', element: LoginPage },
  { path: "*", element: NotFound },
];

export default routes;
