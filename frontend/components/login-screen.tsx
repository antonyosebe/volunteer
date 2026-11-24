"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/lib/brand";
import { apiUrl } from "@/lib/api";
import { markActivity } from "@/lib/session";

export function LoginScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const idle = new URLSearchParams(window.location.search).get("idle");
    if (idle === "1") setMessage("You were logged out after 5 minutes of inactivity.");
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Sign-in failed.");
        return;
      }
      sessionStorage.setItem("volunteer-session", JSON.stringify(body));
      markActivity();
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/app";
    } catch {
      setMessage("The Volunteer API is not running yet.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Image src="/hero-community.png" alt="" fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-teal/55" />
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
          <form onSubmit={onSubmit} className="flex flex-col justify-center px-8 py-10 sm:px-12">
            <Link href="/" className="mb-8 flex items-center">
              <BrandMark tone="teal" compact />
            </Link>
            <h1 className="text-3xl font-semibold text-ink">Log in</h1>
            <p className="mt-2 text-sm text-ink/60">Enter your email or username and password to continue.</p>
            <label className="mt-8 grid gap-2 text-sm font-medium">
              Email or username
              <input
                name="email"
                type="text"
                required
                autoComplete="username"
                className="rounded-lg border border-transparent bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:border-teal"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                className="rounded-lg border border-transparent bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:border-teal"
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input name="remember" type="checkbox" className="h-4 w-4 accent-teal" />
              Remember me
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-6 rounded-lg bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
            >
              {pending ? "Signing in" : "Log in"}
            </button>
            {message ? (
              <p className="mt-3 text-center text-sm font-medium text-orange" role="alert">
                {message}
              </p>
            ) : null}
            <p className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="text-ink/70 hover:text-teal">
                Forgot password
              </Link>
            </p>
            <p className="mt-6 text-center text-sm text-ink/70">
              Not a member?{" "}
              <Link href="/register" className="font-semibold text-ink hover:text-teal">
                Create an account
              </Link>
            </p>
          </form>
          <div className="relative min-h-56 md:min-h-[640px]">
            <Image
              src="/hero-community.png"
              alt="Volunteers collecting litter in a field"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal/80 via-teal/20 to-transparent" />
            <p className="absolute bottom-8 left-8 right-8 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Make a <span className="font-script text-orange">difference</span> wherever you go.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
