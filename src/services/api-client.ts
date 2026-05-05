import type { z } from 'zod';
import { env } from '@/config/env';
import { paginatedSchema } from '@/schemas/_helpers';
import type { APIErrorBody, PaginatedResponse } from '@/types';

// =============================================================================
// Error classes
// =============================================================================

export class APIError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly status?: number;

  constructor(code: string, message: string, details?: Record<string, unknown>, status?: number) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class AuthError extends APIError {
  constructor(code: string, message: string) {
    super(code, message, undefined, 401);
    this.name = 'AuthError';
  }
}

// =============================================================================
// Token management (sessionStorage — sobrevive al F5, muere al cerrar pestaña)
// RFC §4.1 prohibe localStorage; sessionStorage cumple "no persistido a disco".
// =============================================================================

const TOKEN_STORAGE_KEY = 'alizia_auth_token';

function readStoredToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Quota / privacy mode — silently fall back to in-memory only
  }
}

let authToken: string | null = readStoredToken();

export function setAuthToken(token: string | null) {
  authToken = token;
  writeStoredToken(token);
}

export function getAuthToken(): string | null {
  return authToken;
}

// =============================================================================
// Logout callback (set by auth store to avoid circular imports)
// =============================================================================

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

// =============================================================================
// Core request function
// =============================================================================

/**
 * Desenvuelve el shape `{ description: T }` del team-ai-toolkit (web.OK).
 * Alizia-BE, cronos y tich devuelven todos los payloads 2xx envueltos.
 * Si no hay wrapper, devuelve el body tal cual.
 */
function unwrapSuccess<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'description' in body) {
    return (body as { description: T }).description;
  }
  return body as T;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
  schema?: z.ZodType<T>,
): Promise<T> {
  const extraHeaders = options?.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options?.headers)
      ? Object.fromEntries(options.headers)
      : (options?.headers as Record<string, string> | undefined) ?? {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${env.API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 204 No Content — callers using delete/void endpoints should type T as void
  if (res.status === 204) return undefined as unknown as T;

  // Error handling — shape toolkit: { code, description, details? }
  if (!res.ok) {
    let errorBody: APIErrorBody | null = null;
    try {
      errorBody = await res.json();
    } catch {
      throw new APIError('NETWORK_ERROR', `Error de red: ${res.status} ${res.statusText}`, undefined, res.status);
    }

    const code = errorBody?.code ?? 'UNKNOWN_ERROR';
    const message = errorBody?.description ?? 'Error desconocido';
    const details = errorBody?.details;

    if (res.status === 401) {
      onUnauthorized?.();
      throw new AuthError(code, message);
    }

    throw new APIError(code, message, details, res.status);
  }

  const unwrapped = unwrapSuccess<T>(await res.json());
  // Schema is opt-in. When present, validate at the boundary so callers
  // get either a typed payload or a ZodError pinpointing the bad field.
  return schema ? schema.parse(unwrapped) : unwrapped;
}

// =============================================================================
// HTTP method helpers
// =============================================================================

export const apiClient = {
  get: <T>(endpoint: string, schema?: z.ZodType<T>) => request<T>(endpoint, undefined, schema),

  post: <T>(endpoint: string, data?: unknown, schema?: z.ZodType<T>) =>
    request<T>(
      endpoint,
      {
        method: 'POST',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      },
      schema,
    ),

  patch: <T>(endpoint: string, data: unknown, schema?: z.ZodType<T>) =>
    request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      schema,
    ),

  put: <T>(endpoint: string, data: unknown, schema?: z.ZodType<T>) =>
    request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      schema,
    ),

  delete: <T>(endpoint: string, schema?: z.ZodType<T>) => request<T>(endpoint, { method: 'DELETE' }, schema),
};

// =============================================================================
// Pagination helper
// =============================================================================

export async function fetchPaginated<T>(
  endpoint: string,
  limit = 20,
  offset = 0,
  itemSchema?: z.ZodType<T>,
): Promise<PaginatedResponse<T>> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${endpoint}${separator}limit=${limit}&offset=${offset}`;
  if (itemSchema) {
    return apiClient.get(url, paginatedSchema(itemSchema)) as Promise<PaginatedResponse<T>>;
  }
  return apiClient.get<PaginatedResponse<T>>(url);
}
