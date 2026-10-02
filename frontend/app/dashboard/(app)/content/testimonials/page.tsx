import type { Metadata } from "next";

import { TestimonialManager } from "@/components/dashboard/content/testimonial-manager";

export const metadata: Metadata = { title: "Testimonials" };

export default function Page() {
  return <TestimonialManager />;
}
