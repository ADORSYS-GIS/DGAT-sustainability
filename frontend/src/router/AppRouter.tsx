import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import routes from "./routes";

const AppRouter = () => (
  <Router>
    <Routes>
      {routes.map(({ path, element: Element }, idx) => (
        <Route key={idx} path={path} element={<Element />} />
      ))}
    </Routes>
  </Router>
);

export default AppRouter;
