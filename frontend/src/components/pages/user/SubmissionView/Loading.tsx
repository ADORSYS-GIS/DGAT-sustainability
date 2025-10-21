/**
 * @file Loading.tsx
 * @description This file defines the Loading component for the SubmissionView page.
 */
import { Navbar } from "@/components/shared/Navbar";

export const Loading = () => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <div className="pb-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dgrv-blue"></div>
    </div>
  </div>
);