import { Logo } from "@/components/site/logo";

/** Centered card layout for sign-in, sign-up and password screens. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/60 flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="bg-card w-full max-w-sm rounded-2xl border p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
