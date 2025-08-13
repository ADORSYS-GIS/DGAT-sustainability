/*
 * 404 Not Found page that handles invalid routes
 * Automatically redirects users to the home page when accessing non-existent routes
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);
  return null;
};

export default NotFound;
