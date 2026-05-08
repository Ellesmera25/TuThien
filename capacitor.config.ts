import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "vn.tuthien.app",
  appName: "TuThien.vn",
  webDir: "public",
  server: serverUrl
    ? {
        url: serverUrl,
      }
    : undefined,
};

export default config;