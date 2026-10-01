/**
 * django-allauth headless "browser" API (session cookie + CSRF).
 * https://docs.allauth.org/en/latest/headless/openapi-specification/
 */
import { withCsrf } from "./csrf";

const BASE = "/api/v1/auth/browser/v1";

export type AuthFlow = { id: string; is_pending?: boolean; types?: string[] };
export type AuthUser = { id: number; email: string; display: string };
export type FieldError = { message: string; code: string; param?: string };

export type AuthResponse<
  TData = Record<string, unknown>,
  TMeta = Record<string, unknown>,
> = {
  status: number;
  data?: TData & { flows?: AuthFlow[]; user?: AuthUser };
  meta?: TMeta & { is_authenticated?: boolean };
  errors?: FieldError[];
};

async function call<
  TData = Record<string, unknown>,
  TMeta = Record<string, unknown>,
>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<AuthResponse<TData, TMeta>> {
  const headers = withCsrf(method, new Headers({ Accept: "application/json" }));
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as AuthResponse<
    TData,
    TMeta
  >;
  return { ...json, status: response.status };
}

/** Sets the CSRF cookie; call once before the first POST. */
export const ensureCsrf = () => call("/config");

export const getSession = () => call("/auth/session");
export const logout = () => call("/auth/session", "DELETE");
export const login = (email: string, password: string) =>
  call("/auth/login", "POST", { email, password });
export const authenticateTwoFactor = (code: string) =>
  call("/auth/2fa/authenticate", "POST", { code });
export const reauthenticate = (password: string) =>
  call("/auth/reauthenticate", "POST", { password });

export const requestPasswordReset = (email: string) =>
  call("/auth/password/request", "POST", { email });
export const resetPassword = (key: string, password: string) =>
  call("/auth/password/reset", "POST", { key, password });
export const changePassword = (
  current_password: string,
  new_password: string,
) =>
  call("/account/password/change", "POST", { current_password, new_password });

type TotpPending = { secret: string; totp_url: string };
export const getTotp = () =>
  call<{ type?: string }, Partial<TotpPending>>("/account/authenticators/totp");
export const activateTotp = (code: string) =>
  call("/account/authenticators/totp", "POST", { code });
export const deactivateTotp = () =>
  call("/account/authenticators/totp", "DELETE");

type RecoveryCodes = {
  total_code_count: number;
  unused_code_count: number;
  unused_codes: string[];
};
export const getRecoveryCodes = () =>
  call<RecoveryCodes, object>("/account/authenticators/recovery-codes");
export const regenerateRecoveryCodes = () =>
  call<RecoveryCodes, object>("/account/authenticators/recovery-codes", "POST");

export function pendingFlow(res: AuthResponse, id: string): boolean {
  return Boolean(res.data?.flows?.some((f) => f.id === id && f.is_pending));
}

export function needsReauthentication(res: AuthResponse): boolean {
  return (
    res.status === 401 &&
    Boolean(res.data?.flows?.some((f) => f.id === "reauthenticate"))
  );
}

/** First error message, optionally for one field. */
export function errorMessage(
  res: AuthResponse,
  param?: string,
): string | undefined {
  const errors = res.errors ?? [];
  return (param ? errors.find((e) => e.param === param) : errors[0])?.message;
}
