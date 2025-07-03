import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import routes from "./routes";

const renderRoutes = (routesArr) =>
  routesArr.map(({ path, element, children }, idx) =>
    children ? (
      <Route key={idx} path={path} element={element}>
        {renderRoutes(children)}
      </Route>
    ) : (
      <Route key={idx} path={path} element={element} />
    ),
  );

const AppRouter = () => (
  <Router>
    <Routes>{renderRoutes(routes)}</Routes>
  </Router>
);

export default AppRouter;
