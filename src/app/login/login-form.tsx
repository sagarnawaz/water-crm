"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

const input =
  "min-h-13 w-full rounded-xl border border-line bg-surface px-3.5 text-[17px] text-ink placeholder:text-muted";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Phone number
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          placeholder="03xx-xxxxxxx"
          defaultValue={state?.phone}
          required
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-due">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="min-h-13 rounded-xl bg-accent font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
