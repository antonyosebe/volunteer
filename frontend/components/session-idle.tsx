"use client";

import { useEffect } from "react";
import { apiUrl } from "@/lib/api";
import { endSession, idleExpired, markActivity, readSession, seenKey } from "@/lib/session";

export function SessionIdle() {
  useEffect(() => {
    if (readSession() && !sessionStorage.getItem(seenKey)) markActivity();

    let ending = false;
    let lastMark = 0;
    let lastTouch = 0;

    function finish() {
      if (ending || !readSession()) return;
      ending = true;
      const path = window.location.pathname;
      const onApp = path === "/app" || path.startsWith("/app/");
      endSession();
      if (onApp) window.location.href = "/login?idle=1";
    }

    function onActivity() {
      if (!readSession()) return;
      if (idleExpired()) {
        finish();
        return;
      }
      const now = Date.now();
      if (now - lastMark < 5000) return;
      lastMark = now;
      markActivity();
      const id = readSession()?.sessionId;
      if (!id || now - lastTouch < 60_000) return;
      lastTouch = now;
      void fetch(`${apiUrl}/api/auth/touch`, {
        method: "POST",
        headers: { "X-Volunteer-Session": id },
      })
        .then((response) => {
          if (response.status === 401) finish();
        })
        .catch(() => undefined);
    }

    function tick() {
      if (readSession() && idleExpired()) finish();
    }

    tick();
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    for (const event of events) window.addEventListener(event, onActivity, { passive: true });
    window.addEventListener("visibilitychange", tick);
    const timer = window.setInterval(tick, 10_000);

    return () => {
      for (const event of events) window.removeEventListener(event, onActivity);
      window.removeEventListener("visibilitychange", tick);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
