import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";

/**
 * Displays a message when the user is not authorized to access a page.
 */

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="mb-6 text-gray-700">
        You do not have permission to view this page.
      </p>
      <Button onClick={() => navigate("/")}>Go to home</Button>
    </div>
  );
};

export default Unauthorized;
