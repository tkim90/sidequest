function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = rawApiBaseUrl
  ? trimTrailingSlash(rawApiBaseUrl)
  : "/api";

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("API paths must start with '/'.");
  }

  return `${API_BASE_URL}${path}`;
}
