import React from 'react';
import { useAuth } from '../hooks/useAuth';

type AuthGuardProps = {
  children: React.ReactNode;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-4">Please log in to access this page</p>
        <button
          onClick={login}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
