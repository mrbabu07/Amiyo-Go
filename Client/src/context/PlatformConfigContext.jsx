import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getPublicPlatformConfig } from "../services/api";

const defaultConfig = {
  featureFlags: {
    guestCheckout: true,
    vendorSignups: true,
    shopDirectory: true,
    cod: true,
    reviews: true,
    referrals: true,
  },
  storefront: {
    shopsVisible: true,
  },
  maintenanceMode: {
    enabled: false,
    message: "",
  },
  seo: {},
};

const PlatformConfigContext = createContext({
  config: defaultConfig,
  loading: true,
  isFeatureEnabled: () => true,
  isShopDirectoryVisible: true,
  refreshPlatformConfig: () => Promise.resolve(defaultConfig),
});

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      const response = await getPublicPlatformConfig();
      const nextConfig = {
        ...defaultConfig,
        ...(response.data?.data || {}),
        featureFlags: {
          ...defaultConfig.featureFlags,
          ...(response.data?.data?.featureFlags || {}),
        },
        storefront: {
          ...defaultConfig.storefront,
          ...(response.data?.data?.storefront || {}),
        },
      };
      setConfig(nextConfig);
      return nextConfig;
    } catch (error) {
      console.error("Failed to load public platform config:", error);
      setConfig(defaultConfig);
      return defaultConfig;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const value = useMemo(() => {
    const isFeatureEnabled = (key) => config.featureFlags?.[key] !== false;
    const isShopDirectoryVisible =
      isFeatureEnabled("shopDirectory") && config.storefront?.shopsVisible !== false;

    return {
      config,
      loading,
      isFeatureEnabled,
      isShopDirectoryVisible,
      refreshPlatformConfig: loadConfig,
    };
  }, [config, loading]);

  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}
