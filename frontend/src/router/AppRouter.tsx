import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import routes from "./routes";
import MainLayout from "@/layouts/MainLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

// Helper function to render routes recursively
const renderRoutes = (routes: any[]) => {
  return routes.map(({ path, element, children }, idx) => (
    <Route
      key={idx}
      path={path}
      element={
        React.isValidElement(element)
          ? element
          : React.createElement(element)
      }
    >
      {children && renderRoutes(children)}
    </Route>
  ));
};

const AppRouter = () => (
  <Router>
    <MainLayout>
      <React.Suspense fallback={<LoadingSpinner size="hero" fullPage text="Loading Sustainability Portal..." />}>
        <Routes>
          {renderRoutes(routes)}
        </Routes>
      </React.Suspense>
    </MainLayout>
  </Router>
);

export default AppRouter;
