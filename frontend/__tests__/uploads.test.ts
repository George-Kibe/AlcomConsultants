import { expect, test } from "vitest";

import { rejectReason } from "@/lib/uploads";

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
