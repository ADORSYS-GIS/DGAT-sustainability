import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NoOrganisation: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Organisation Required</h1>
        <p className="mb-6 text-gray-700">
          You need to be a member of an organisation to start an assessment.<br />
          Please contact your organisation admin to invite you to the organisation.
        </p>
        <Button onClick={() => navigate("/")}>Return to Home</Button>
      </div>
    </div>
  );
};

export default NoOrganisation; 