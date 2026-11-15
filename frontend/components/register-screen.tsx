"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { markActivity } from "@/lib/session";

export function RegisterScreen({ account }: { account: "volunteer" | "organisation" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const organisation = account === "organisation";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password: form.get("password"),
          account,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setMessage(body?.message ?? "Registration failed.");
        return;
      }
      if (!organisation) {
        const signedIn = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.get("email"),
            password: form.get("password"),
          }),
        });
        const session = (await signedIn.json().catch(() => null)) as { message?: string } | null;
        if (!signedIn.ok || !session) {
          setMessage(session?.message ?? "Account created. Log in to continue.");
          return;
        }
        sessionStorage.setItem("volunteer-session", JSON.stringify(session));
        markActivity();
        window.location.href = "/app";
        return;
      }
      setMessage(body?.message ?? "Account created.");
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
      <div className="relative flex min-h-screen flex-col px-4 py-8 sm:px-8">
        <div className="mx-auto my-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:grid-cols-2">
          <form onSubmit={onSubmit} className="flex flex-col justify-center px-8 py-10 sm:px-12">
            <Link href="/" className="mb-5 flex items-center gap-2 text-sm font-semibold text-teal">
              <span className="grid h-8 min-w-8 place-items-center rounded-full bg-orange px-1.5 text-xs font-semibold tracking-tight text-white" aria-hidden>
                tra
              </span>
              Volunteer
            </Link>
            <h1 className="text-center text-3xl font-semibold text-ink">
              {organisation ? "Register an organisation" : "Register as a volunteer"}
            </h1>
            <p className="mt-2 text-center text-sm text-ink/60">
              {organisation
                ? "Your organisation stays pending until a staff admin approves it."
                : "You can browse first. An account is required when you sign up for an opportunity."}
            </p>
            <div className="mt-6 grid grid-cols-2 rounded-full bg-[#f3f4f6] p-1 text-center text-sm">
              <Link
                href="/register"
                className={`rounded-full px-3 py-2 ${organisation ? "text-ink/70" : "bg-teal font-semibold text-white"}`}
              >
                Volunteer
              </Link>
              <Link
                href="/register?account=organisation"
                className={`rounded-full px-3 py-2 ${organisation ? "bg-teal font-semibold text-white" : "text-ink/70"}`}
              >
                Organisation
              </Link>
            </div>
            <label className="mt-6 grid gap-2 text-sm font-medium">
              {organisation ? "Organisation name" : "Full name"}
              <input
                name="fullName"
                required
                autoComplete="name"
                className="rounded-lg border border-transparent bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:border-teal"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
                autoComplete="new-password"
                className="rounded-lg border border-transparent bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:border-teal"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-6 rounded-lg bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
            >
              {pending ? "Creating account" : "Create account"}
            </button>
            {message ? <p className="mt-3 text-center text-sm">{message}</p> : null}
            <p className="mt-6 text-center text-sm text-ink/70">
              Already a member?{" "}
              <Link href="/login" className="font-semibold text-ink hover:text-teal">
                Log in
              </Link>
            </p>
          </form>
          <div className="relative min-h-48 md:min-h-full">
            <Image
              src={organisation ? "/mission-volunteers.png" : "/hero-community.png"}
              alt={organisation ? "Raised hands painted in bright colours" : "Volunteers collecting litter in a field"}
              fill
              priority
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
