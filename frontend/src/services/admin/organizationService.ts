export interface Organization {
  organizationId: string;
  name: string;
  location: string;
  contactEmail: string;
  description: string;
}

export interface User {
  userId: string;
  username: string;
  email: string;
  role: "admin" | "org_admin" | "org_user";
  organizationId?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
}

//organization service

export const AllOrganizations = async () => {
  const response = await fetch("http://localhost:8000/api/organizations");
  if (!response.ok) throw new Error("Failed to fetch organizations");
  return response.json();
};

export const getAllUsers = async () => {
  const response = await fetch("http://localhost:8000/api/users");
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
};

export const getAllAssessments = async () => {
  const response = await fetch("http://localhost:8000/api/assessments");
  if (!response.ok) throw new Error("Failed to fetch assessments");
  return response.json();
};
