import { getClientApiUrl, getClientSession } from './client-session';

// ── Types ─────────────────────────────────────────────────

export interface PlanLimitError {
  statusCode: 403;
  code: 'PLAN_LIMIT';
  message: string;
  details: {
    resource?: string;
    feature?: string;
    limit?: number;
    current?: number;
    requiredPlan?: string;
    requiredPlanDisplayName?: string;
  };
}

type PlanLimitHandler = (error: PlanLimitError) => void;

// ── Global handler registry ───────────────────────────────

let _planLimitHandler: PlanLimitHandler | null = null;

/**
 * Register a global handler for PLAN_LIMIT 403 errors.
 * Called once from PlanLimitInterceptor component.
 */
export function registerPlanLimitHandler(handler: PlanLimitHandler) {
  _planLimitHandler = handler;
}

export function unregisterPlanLimitHandler() {
  _planLimitHandler = null;
}

// ── API Fetch Wrapper ─────────────────────────────────────

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** JSON body (auto-serialized) */
  body?: any;
  /** Skip the plan limit interceptor for this call */
  skipPlanInterceptor?: boolean;
}

/**
 * Wrapper around fetch for API calls.
 * - Automatically adds workspace-id header
 * - Serializes JSON body
 * - Intercepts 403 PLAN_LIMIT responses and triggers the global handler
 * - Returns parsed JSON data
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, skipPlanInterceptor, ...fetchOptions } = options;
  const { workspaceId } = getClientSession();
  const baseUrl = getClientApiUrl();

  // Ensure path starts with /
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 403 PLAN_LIMIT
  if (res.status === 403 && !skipPlanInterceptor) {
    try {
      const errorBody = await res.clone().json();
      if (errorBody?.code === 'PLAN_LIMIT' && _planLimitHandler) {
        _planLimitHandler(errorBody as PlanLimitError);
      }
    } catch {
      // Not a JSON PLAN_LIMIT error, continue
    }
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    let errorJson: any;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { message: errorText };
    }
    const error = new Error(errorJson.message || `API Error ${res.status}`) as any;
    error.status = res.status;
    error.code = errorJson.code;
    error.details = errorJson.details;
    throw error;
  }

  // Handle empty responses
  const text = await res.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}
