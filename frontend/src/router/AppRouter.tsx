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
          {routes.map(({ path, element: Element }, idx) => (
            <Route key={idx} path={path} element={<Element />} />
          ))}
        </Routes>
      </MainLayout>
    </Router>
  </QueryClientProvider>
);

export default AppRouter;
