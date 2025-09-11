import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { toast } from "sonner";
import routes from "./routes";
import MainLayout from "@/layouts/MainLayout";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(`Something went wrong: ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error(error.message || "An unexpected error occurred");
      },
    },
  },
});

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
  <QueryClientProvider client={queryClient}>
    <Router>
      <MainLayout>
        <Routes>
          {renderRoutes(routes)}
        </Routes>
      </MainLayout>
    </Router>
  </QueryClientProvider>
);

export default AppRouter;
