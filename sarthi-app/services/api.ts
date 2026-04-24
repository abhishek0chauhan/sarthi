import { API_BASE, API_TIMEOUT_MS } from '@/config/api';
import { authService } from '@/services/auth.service';

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await authService.getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getAuthHeader()),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    if (response.status === 204) return undefined as T;

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
