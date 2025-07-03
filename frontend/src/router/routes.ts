import React from "react";
import { Callback } from "../pages/user/Callback";
import { Dashboard } from "../pages/user/Dashboard";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import NotFound from "../pages/NotFound";
import Unauthorized from "../pages/user/Unauthorized";
import { ProtectedRoute } from "./ProtectedRoute";
import { Welcome } from "../pages/HomePage";

// Example route definitions
const routes = [
  { path: "/callback", element: React.createElement(Callback) },
  { path: "/unauthorized", element: React.createElement(Unauthorized) },
  { path: "/", element: React.createElement(Welcome) },
  {
    path: "/dashboard",
    element: React.createElement(ProtectedRoute, {
      allowedRoles: ["Org_User", "Org_Admin", "Org_Expert"],
    }),
    children: [{ path: "", element: React.createElement(Dashboard) }],
  },
  {
    path: "/admin",
    element: React.createElement(ProtectedRoute, {
      allowedRoles: ["DGRV_Admin"],
    }),
    children: [{ path: "", element: React.createElement(AdminDashboard) }],
  },
  { path: "*", element: React.createElement(NotFound) },
];

export default routes;
