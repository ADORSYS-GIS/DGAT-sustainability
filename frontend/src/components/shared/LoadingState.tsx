/*
 * Shared loading state component for full-page loading
 * Displays spinner animation while data is being fetched
 */

import { LoadingSpinner } from "./LoadingSpinner";
import { Navbar } from "./Navbar";

interface LoadingStateProps {
  message?: string;
  variant?: "fullscreen" | "container";
  size?: "sm" | "md" | "lg";
  showNavbar?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  variant = "fullscreen",
  size = "lg",
  showNavbar = false,
}) => {
  if (variant === "fullscreen") {
    return (
      <div className="min-h-screen bg-gray-50">
        {showNavbar && <Navbar />}
        <div className="pt-20 pb-8 flex items-center justify-center">
          <LoadingSpinner size={size} text={message} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={size} text={message} />
      </div>
    </div>
  );
};
