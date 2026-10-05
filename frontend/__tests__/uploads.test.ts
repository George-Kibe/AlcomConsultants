import { describe, expect, test } from "vitest";

import { photoAdvice, rejectReason } from "@/lib/uploads";

const file = (name: string, type: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type });

test.each([
  ["house.jpg", "image/jpeg", undefined],
  ["house.webp", "image/webp", undefined],
  ["IMG_1234.HEIC", "", undefined], // iPhones often send HEIC without a type
  ["plan.pdf", "application/pdf", "Only photos"],
  ["clip.mp4", "video/mp4", "Only photos"],
])("%s → %s", (name, type, expected) => {
  const reason = rejectReason(file(name, type), 20 * 1024 * 1024);
  if (expected) expect(reason).toContain(expected);
  else expect(reason).toBeUndefined();
});

test("rejects files over the size limit", () => {
  expect(rejectReason(file("big.jpg", "image/jpeg", 2048), 1024)).toBe(
    "Too large (max 0 MB).",
  );
  expect(
    rejectReason(
      file("big.jpg", "image/jpeg", 25 * 1024 * 1024),
      20 * 1024 * 1024,
    ),
  ).toBe("Too large (max 20 MB).");
});

describe("photoAdvice", () => {
  test.each([
    [1600, 1200, undefined], // 4:3, the ideal
    [1920, 1080, undefined], // 16:9 is fine too
    [null, null, undefined], // unknown size
    [1200, 1600, "Portrait"],
    [800, 600, "Small"],
    [3000, 1000, "Very wide"],
  ])("%s × %s", (width, height, expected) => {
    const advice = photoAdvice(width, height);
    if (expected) expect(advice).toMatch(expected);
    else expect(advice).toBeUndefined();
  });
});
