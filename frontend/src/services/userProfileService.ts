import { getAccessToken } from "./shared/authService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface UserProfile {
  user_id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  organizations: Record<string, { id: string; categories: string[] }> | null;
  roles: string[];
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to get profile" }));
    throw new Error(errorData.message || "Failed to get profile");
  }

  return response.json();
}

export async function updateUserProfile(
  data: UpdateProfileRequest
): Promise<ApiResponse<UserProfile>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to update profile" }));
    throw new Error(errorData.message || "Failed to update profile");
  }

  return response.json();
}

export async function changePassword(
  data: ChangePasswordRequest
): Promise<ApiResponse<void>> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/user/profile/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to change password" }));
    throw new Error(errorData.message || "Failed to change password");
  }

  return response.json();
}