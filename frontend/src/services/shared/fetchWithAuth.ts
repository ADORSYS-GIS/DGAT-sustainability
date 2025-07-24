import { getAccessToken } from './authService';

/**
 * Fetch wrapper that automatically adds Bearer token to requests
 */
export const fetchWithAuth: typeof fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  try {
    const token = await getAccessToken();
    
    if (token) {
      (init ??= {}).headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.warn('Failed to get access token for request:', error);
  }

  return fetch(input, init);
}; 