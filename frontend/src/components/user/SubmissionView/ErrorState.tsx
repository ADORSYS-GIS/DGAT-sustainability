/*
 * Displays error message when submission data fails to load
 * Shows full-screen error state with navbar and centered error text
 */

import { Navbar } from "@/components/shared/Navbar";

export const ErrorState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 flex items-center justify-center">
        <div className="text-red-600">Error loading submission details.</div>
      </div>
    </div>
  );
};
