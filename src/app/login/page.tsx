import type { Metadata } from "next";
import { DropIcon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Paani Register" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col gap-5">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink">
          <DropIcon className="size-8" />
        </span>
        <div>
          <h1 className="font-display text-[28px] font-bold">Paani Register</h1>
          <p className="mt-1 text-muted">Your water supply register, on your phone.</p>
        </div>
        <LoginForm />
        <p className="text-sm text-muted">
          Your account is set up for you by Paani Register support. Forgot your password? Ask support to reset it.
        </p>
      </div>
    </main>
  );
}
