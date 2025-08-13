/*
 * Shows loading spinner while submission data is being fetched
 * Displays full-screen loading state with navbar and centered spinner
 */

import { Navbar } from "@/components/shared/Navbar";

export const LoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 pb-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
      </div>
    </div>
  );
}; 