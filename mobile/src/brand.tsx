import { createContext, useContext, useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { apiUrl } from "./api";

const localLogo = require("../assets/logo.png");

export type BrandInfo = {
  siteName: string;
  logo: ImageSourcePropType;
};

const fallback: BrandInfo = {
  siteName: "try volunteer",
  logo: localLogo,
};

const BrandContext = createContext<BrandInfo>(fallback);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandInfo>(fallback);

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/api/branding`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { siteName?: string; logoPath?: string } | null) => {
        if (!active || !body) return;
        const logoPath = body.logoPath?.trim() ?? "";
        const logo = !logoPath
          ? localLogo
          : logoPath.startsWith("http")
            ? { uri: logoPath }
            : { uri: `${apiUrl}/uploads/${logoPath.replace(/^\//, "")}` };
        setBrand({
          siteName: body.siteName?.trim() || fallback.siteName,
          logo,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  return useContext(BrandContext);
}
