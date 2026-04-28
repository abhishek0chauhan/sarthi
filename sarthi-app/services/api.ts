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

  const url = `${API_BASE}${path}`;
  console.log(`[API] ${options.method ?? 'GET'} ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    console.log(`[API] ${options.method ?? 'GET'} ${path} → ${response.status}`);

    if (!response.ok) {
      const body = await response.text();
      console.error(`[API] Error ${response.status}:`, body);
      throw new ApiError(response.status, body);
    }

    if (response.status === 204) return undefined as T;

    const data = await response.json();
    console.log(`[API] ${path} response:`, JSON.stringify(data).slice(0, 300));
    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    console.error(`[API] ${path} failed:`, err?.message ?? err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
