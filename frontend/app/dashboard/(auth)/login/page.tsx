import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/dashboard/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
