/**
 * @file Error.tsx
 * @description This file defines the Error component for the SubmissionView page.
 */
import { Navbar } from "@/components/shared/Navbar";

export const Error = () => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <div className="pb-8 flex items-center justify-center">
      <div className="text-red-600">Error loading submission details.</div>
    </div>
  </div>
);