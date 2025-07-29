import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Shield, AlertTriangle, Home, LogIn } from "lucide-react";

/**
 * Displays a message when the user is not authorized to access a page.
 */

const Unauthorized = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 mb-6">
            You do not have permission to access this page. This could be because:
          </p>
          
          {/* Reasons */}
          <div className="text-left mb-6 space-y-2">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                You are not logged in
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Your account doesn't have the required permissions
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Your session may have expired
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
            
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Try Logging In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
