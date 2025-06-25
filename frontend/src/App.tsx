import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Welcome } from "@/pages/Welcome";
import { Dashboard } from "@/pages/Dashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { Assessment } from "@/pages/Assessment";
import { Assessments } from "@/pages/Assessments";
import { ActionPlan } from "@/pages/ActionPlan";
import { ManageCategories } from "@/pages/admin/ManageCategories";
import { ManageQuestions } from "@/pages/admin/ManageQuestions";
import { ManageOrganizations } from "@/pages/admin/ManageOrganizations";
import { ManageUsers } from "@/pages/admin/ManageUsers";
import { ReviewAssessments } from "@/pages/admin/ReviewAssessments";
import { StandardRecommendations } from "@/pages/admin/StandardRecommendations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading application..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate
              to={user?.role === "admin" ? "/admin" : "/dashboard"}
              replace
            />
          ) : (
            <Welcome />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessment/:type"
        element={
          <ProtectedRoute>
            <Assessment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute requiredRole="admin">
            <ManageCategories />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/questions"
        element={
          <ProtectedRoute requiredRole="admin">
            <ManageQuestions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/organizations"
        element={
          <ProtectedRoute requiredRole="admin">
            <ManageOrganizations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <ManageUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute requiredRole="admin">
            <ReviewAssessments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/recommendations"
        element={
          <ProtectedRoute requiredRole="admin">
            <StandardRecommendations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessments"
        element={
          <ProtectedRoute>
            <Assessments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/action-plan"
        element={
          <ProtectedRoute>
            <ActionPlan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-dgrv-blue mb-4">
                  Admin Module
                </h1>
                <p className="text-gray-600">
                  Management interfaces coming soon!
                </p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
