import { afterEach, describe, expect, test } from "vitest";

import {
  errorMessage,
  needsReauthentication,
  pendingFlow,
} from "@/lib/api/auth";
import { getCsrfToken, withCsrf } from "@/lib/api/csrf";
import { safeNext } from "@/lib/safe-redirect";

describe("safeNext", () => {
  test.each([
    ["/dashboard/security", "/dashboard/security"],
    ["/dashboard?tab=x", "/dashboard?tab=x"],
    [null, "/dashboard"],
    ["", "/dashboard"],
    ["https://evil.example/dashboard", "/dashboard"],
    ["//evil.example/dashboard", "/dashboard"],
    ["/about", "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("CSRF", () => {
  afterEach(() => {
    document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  test("reads the token from the cookie", () => {
    document.cookie = "other=1";
    document.cookie = "csrftoken=abc123";
    expect(getCsrfToken()).toBe("abc123");
  });

  test("adds the header only to unsafe methods", () => {
    document.cookie = "csrftoken=abc123";
    expect(withCsrf("POST", new Headers()).get("X-CSRFToken")).toBe("abc123");
    expect(withCsrf("delete", new Headers()).get("X-CSRFToken")).toBe("abc123");
    expect(withCsrf("GET", new Headers()).get("X-CSRFToken")).toBeNull();
  });
});

describe("allauth responses", () => {
  const mfaPending = {
    status: 401,
    data: {
      flows: [{ id: "login" }, { id: "mfa_authenticate", is_pending: true }],
    },
  };

  test("pendingFlow", () => {
    expect(pendingFlow(mfaPending, "mfa_authenticate")).toBe(true);
    expect(pendingFlow(mfaPending, "login")).toBe(false);
    expect(pendingFlow({ status: 200 }, "mfa_authenticate")).toBe(false);
  });

  test("needsReauthentication", () => {
    expect(
      needsReauthentication({
        status: 401,
        data: { flows: [{ id: "reauthenticate" }] },
      }),
    ).toBe(true);
    expect(needsReauthentication(mfaPending)).toBe(false);
  });

  test("errorMessage", () => {
    const res = {
      status: 400,
      errors: [
        { message: "Enter a valid email.", code: "invalid", param: "email" },
        { message: "Wrong code.", code: "incorrect_code", param: "code" },
      ],
    };
    expect(errorMessage(res)).toBe("Enter a valid email.");
    expect(errorMessage(res, "code")).toBe("Wrong code.");
    expect(errorMessage({ status: 200 })).toBeUndefined();
  });
});
