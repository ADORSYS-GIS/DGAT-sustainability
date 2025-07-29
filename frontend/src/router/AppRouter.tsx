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

const AppRouter = () => (
  <QueryClientProvider client={queryClient}>
    <Router>
      <MainLayout>
        <Routes>
          {routes.map((route, idx) => (
            <Route
              key={idx}
              path={route.path}
              element={route.element}
            >
              {route.children?.map((child, childIdx) => (
                <Route
                  key={childIdx}
                  path={child.path}
                  element={child.element}
                />
              ))}
            </Route>
          ))}
        </Routes>
      </MainLayout>
    </Router>
  </QueryClientProvider>
);

export default AppRouter;
