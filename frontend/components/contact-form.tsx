"use client";

import { FormEvent, useState } from "react";
import { apiUrl } from "@/lib/api";

export function ContactForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const note = String(form.get("message") ?? "").trim();
    const missing = [
      name ? null : "name",
      email ? null : "email",
      note ? null : "message",
    ].filter(Boolean);

    if (missing.length > 0) {
      setMessage(`Add your ${missing.join(", ")} before sending.`);
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: note }),
      });
      setMessage(response.ok ? "Message sent. We will reply by email." : "The mail service is not connected yet. Your message was not sent.");
    } catch {
      setMessage("The mail service is not connected yet. Your message was not sent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-lg sm:p-8" noValidate>
      <h2 className="text-2xl font-semibold text-teal">Send a message</h2>
      <label className="mt-6 grid gap-2 text-sm font-medium">
        Name
        <input name="name" autoComplete="name" className="rounded-lg bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-teal" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" className="rounded-lg bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-teal" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-medium">
        Message
        <textarea name="message" rows={5} className="rounded-lg bg-[#f3f4f6] px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-teal" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-60"
      >
        {pending ? "Sending" : "Send message"}
      </button>
      {message ? <p className="mt-4 text-sm leading-6">{message}</p> : null}
    </form>
  );
}
