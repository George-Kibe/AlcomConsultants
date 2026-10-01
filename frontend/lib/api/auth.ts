/**
 * django-allauth headless "browser" API (session cookie + CSRF).
 * https://docs.allauth.org/en/latest/headless/openapi-specification/
 */
import { getCsrfToken, withCsrf } from "./csrf";

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

export type AuthConfig = {
  socialaccount?: { providers: { id: string; name: string }[] };
};

/** Sets the CSRF cookie; call once before the first POST. Also lists sign-in providers. */
export const ensureCsrf = () => call<AuthConfig>("/config");

export const getSession = () => call("/auth/session");
export const logout = () => call("/auth/session", "DELETE");
export const login = (email: string, password: string) =>
  call("/auth/login", "POST", { email, password });
export const authenticateTwoFactor = (code: string) =>
  call("/auth/2fa/authenticate", "POST", { code });
export const reauthenticate = (password: string) =>
  call("/auth/reauthenticate", "POST", { password });

export const signup = (name: string, email: string, password: string) =>
  call("/auth/signup", "POST", { name, email, password });
export const verifyEmail = (key: string) =>
  call("/auth/email/verify", "POST", { key });
/** Send the verification email again (rate-limited by allauth). */
export const resendVerification = (email: string) =>
  call("/account/email", "PUT", { email });

/**
 * Start social sign-in: a real form POST, because the browser must follow the redirect
 * to the provider. allauth sends the user back to `callbackUrl` afterwards.
 */
export function redirectToProvider(provider: string, callbackUrl: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${BASE}/auth/provider/redirect`;
  const fields = {
    provider,
    callback_url: callbackUrl,
    process: "login",
    csrfmiddlewaretoken: getCsrfToken() ?? "",
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

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

/** Keys in emailed links are URL-encoded (e.g. ":" as %3A); route params may or may not be. */
export function decodeKey(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}
