/**
 * @file utils.ts
 * @description This file contains utility functions for the Action Plan components.
 */

export const getStatusColor = (status: string) => {
  switch (status) {
    case "todo":
      return "bg-gray-100 border-gray-300";
    case "in_progress":
      return "bg-blue-50 border-blue-300";
    case "done":
      return "bg-green-50 border-green-300";
    case "approved":
      return "bg-emerald-50 border-emerald-300";
    default:
      return "bg-gray-100 border-gray-300";
  }
};