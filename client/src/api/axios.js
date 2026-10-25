import axios from 'axios';

export const TOKEN_KEY = 'kalaconnect.token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 → sign out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('kalaconnect:signed-out'));
    }
    return Promise.reject(error);
  }
);

/**
 * Turns an axios failure into something a form can show.
 */
export function readApiError(error, fallback = 'Something went wrong. Try again.') {
  const data = error?.response?.data;
  return {
    message: data?.error || (error?.request ? 'Cannot reach the server. Is the API running?' : fallback),
    fields: data?.fields || {},
  };
}

export default api;
