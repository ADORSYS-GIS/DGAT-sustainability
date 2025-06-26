export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "org_admin" | "org_user";
  organizationId?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}
