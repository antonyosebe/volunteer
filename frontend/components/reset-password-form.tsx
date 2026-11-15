"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

export function ResetPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message ?? (response.ok ? "Password updated. You can log in." : "Could not update the password."));
      setDone(response.ok);
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid max-w-md gap-4">
      <label className="grid gap-1 text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className="rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="rounded-md bg-teal px-4 py-2 text-white hover:bg-teal/90 disabled:opacity-60">
        {pending ? "Saving" : "Save new password"}
      </button>
      {message ? <p className="text-sm font-medium text-orange" role="alert">{message}</p> : null}
      {done ? (
        <Link href="/login" className="text-sm font-medium text-teal underline">
          Go to log in
        </Link>
      ) : null}
    </form>
  );
}
