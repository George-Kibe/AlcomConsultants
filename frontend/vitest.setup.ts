import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Unmount rendered trees between tests (automatic only with Vitest globals enabled).
afterEach(cleanup);

// jsdom has no matchMedia; tests can override `matches` per query.
export const mediaMatches = new Map<string, boolean>();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: mediaMatches.get(query) ?? false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom reports the page as hidden by default; real browsers start visible.
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => false,
});
