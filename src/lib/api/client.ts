import { useAuthStore } from '@/lib/store/auth';

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/token/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const { setAuth } = useAuthStore.getState();
    
    // Update tokens in store
    setAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: useAuthStore.getState().user!,
    });

    return data.access_token;
  } catch (error) {
    return null;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  
  // Use a plain record so we can safely index into it
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If 401 and we have a refresh token, try to refresh
  // Skip refresh for auth endpoints (login, register, etc.) as they don't require auth
  const isAuthEndpoint = endpoint.includes('/api/auth/');
  if (response.status === 401 && useAuthStore.getState().refreshToken && !isAuthEndpoint) {
    const newAccessToken = await refreshAccessToken();
    
    if (newAccessToken) {
      // Retry the request with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed, clear auth
      useAuthStore.getState().clearAuth();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = error.error || `HTTP error! status: ${response.status}`;
    
    // For auth endpoints, don't throw token-related errors as they're expected
    if (isAuthEndpoint && response.status === 401) {
      throw new Error(errorMessage);
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function apiRequestFormData<T>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    method: options.method || 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

