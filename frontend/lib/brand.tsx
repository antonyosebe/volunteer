"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export const defaultPrimary = "#1286c8";

export type Brand = {
  siteName: string;
  tagline: string;
  primaryColor: string;
  logoPath: string;
  logoUrl: string;
  refresh: () => Promise<void>;
};

const fallback: Brand = {
  siteName: "Volunteer",
  tagline: "Make a difference wherever you go.",
  primaryColor: defaultPrimary,
  logoPath: "",
  logoUrl: "/logo.png",
  refresh: async () => {},
};

const BrandContext = createContext<Brand>(fallback);

export function logoUrlFor(logoPath?: string | null) {
  if (!logoPath) return "/logo.png";
  if (logoPath.startsWith("http") || logoPath.startsWith("/")) return logoPath;
  return `${apiUrl}/uploads/${logoPath}`;
}

export function Branding({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Omit<Brand, "refresh">>(fallback);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/branding`, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { siteName?: string; tagline?: string; primaryColor?: string; logoPath?: string };
      setBrand({
        siteName: body.siteName?.trim() || fallback.siteName,
        tagline: body.tagline?.trim() || fallback.tagline,
        primaryColor: /^#[0-9a-fA-F]{6}$/.test(body.primaryColor ?? "") ? body.primaryColor! : defaultPrimary,
        logoPath: body.logoPath ?? "",
        logoUrl: logoUrlFor(body.logoPath),
      });
    } catch {
      setBrand((current) => current);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.style.setProperty("--teal", brand.primaryColor);
  }, [brand.primaryColor]);

  return <BrandContext.Provider value={{ ...brand, refresh }}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}

export function BrandMark({ tone = "ink", compact = false }: { tone?: "ink" | "white" | "teal"; compact?: boolean }) {
  const { siteName, logoUrl } = useBrand();
  const text = tone === "white" ? "text-white" : tone === "teal" ? "text-teal" : "text-ink";
  const size = compact ? "h-9 w-9" : "h-10 w-10";

  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${text}`}>
      <img src={logoUrl} alt="" className={`${size} rounded-md bg-white object-contain`} />
      <span className={compact ? "text-sm" : "text-lg"}>{siteName}</span>
    </span>
  );
}
