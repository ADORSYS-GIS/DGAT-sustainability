import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dgrv-blue/10 to-dgrv-green/10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center animate-fade-in">
        <div className="mb-6">
          <span className="inline-block bg-dgrv-blue text-white rounded-full px-5 py-2 text-3xl font-bold shadow-lg mb-4">
            404
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-dgrv-blue mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Sorry, the page{" "}
            <span className="font-mono text-dgrv-green">
              {location.pathname}
            </span>{" "}
            does not exist or has been moved.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-dgrv-blue hover:bg-dgrv-green transition-colors text-white font-semibold px-6 py-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-dgrv-green focus:ring-offset-2"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
