import MainLayout from "@/layouts/MainLayout";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { toast } from "sonner";
import routes from "./routes";

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
          {routes.map(({ path, element }, idx) => (
            <Route
              key={idx}
              path={path}
              element={
                React.isValidElement(element)
                  ? element
                  : React.createElement(element)
              }
            />
          ))}
        </Routes>
      </MainLayout>
    </Router>
  </QueryClientProvider>
);

export default AppRouter;
