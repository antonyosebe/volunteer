import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { logout as logoutRequest, type Session } from "./api";

const storageKey = "volunteer-session";

type SessionApi = {
  ready: boolean;
  session: Session | null;
  save: (session: Session) => Promise<void>;
  clear: () => Promise<void>;
};

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as Session;
        if (parsed?.sessionId) setSession(parsed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const api = useMemo<SessionApi>(
    () => ({
      ready,
      session,
      async save(next) {
        setSession(next);
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      },
      async clear() {
        const id = session?.sessionId;
        setSession(null);
        await AsyncStorage.removeItem(storageKey);
        if (id) void logoutRequest(id);
      },
    }),
    [ready, session],
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
