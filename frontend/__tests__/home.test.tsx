import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/(site)/page";

test("home page has a single h1 and a property search", () => {
  render(<Home />);

  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    screen.getByRole("search", { name: "Search properties" }),
  ).toHaveAttribute("action", "/properties");
  expect(screen.getByRole("radio", { name: "Buy" })).toBeChecked();
});
