import axios from "axios";
import type { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// Singleton API instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send httpOnly cookie for refresh token
});

// ── Request interceptor: attach access token ──
api.interceptors.request.use((config) => {
  // Access token comes from Zustand store
  // Import lazily to avoid circular deps
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401, auto-refresh ──
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];
type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            const headers = (original.headers ?? {}) as Record<string, string>;
            headers.Authorization = `Bearer ${token}`;
            original.headers = headers as NonNullable<
              AxiosRequestConfig["headers"]
            >;
            resolve(api(original));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = data.data.accessToken;
        setAccessToken(newToken);

        // Retry queued requests
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        const headers = (original.headers ?? {}) as Record<string, string>;
        headers.Authorization = `Bearer ${newToken}`;
        original.headers = headers as NonNullable<
          AxiosRequestConfig["headers"]
        >;
        return api(original);
      } catch {
        // Refresh failed — clear auth state + redirect to login
        clearAccessToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Token management — pure memory ──
// These functions bridge between the API client and Zustand store
let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string): void {
  _accessToken = token;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

export default api;
