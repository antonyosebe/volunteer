"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export type Session = {
  sessionId?: string;
  clientId?: string;
  userId?: string;
  fullName?: string;
  email?: string;
  clientType?: string;
};

export const seenKey = "volunteer-session-seen";
export const idleLimitMs = 5 * 60 * 1000;

export function roleLabel(clientType?: string) {
  if (clientType === "admin") return "Admin";
  if (clientType === "org_admin" || clientType === "org_member") return "Organisation";
  if (clientType === "volunteer") return "Volunteer";
  return "Account";
}

export function initials(fullName?: string) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function readSession(): Session | null {
  const raw = sessionStorage.getItem("volunteer-session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem("volunteer-session");
    return null;
  }
}

export function writeSession(patch: Session) {
  const current = readSession() ?? {};
  sessionStorage.setItem("volunteer-session", JSON.stringify({ ...current, ...patch }));
  window.dispatchEvent(new Event("volunteer-session"));
}

export function markActivity() {
  if (!readSession()) return;
  sessionStorage.setItem(seenKey, String(Date.now()));
}

export function idleExpired() {
  if (!readSession()) return false;
  const raw = sessionStorage.getItem(seenKey);
  if (!raw) return false;
  const seen = Number(raw);
  return !Number.isFinite(seen) || Date.now() - seen >= idleLimitMs;
}

export function endSession() {
  const id = readSession()?.sessionId;
  sessionStorage.removeItem("volunteer-session");
  sessionStorage.removeItem(seenKey);
  window.dispatchEvent(new Event("volunteer-session"));
  if (!id) return;
  void fetch(`${apiUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "X-Volunteer-Session": id },
    keepalive: true,
  }).catch(() => undefined);
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const load = () => setSession(readSession());
    load();
    window.addEventListener("volunteer-session", load);
    return () => window.removeEventListener("volunteer-session", load);
  }, []);

  return session;
}
