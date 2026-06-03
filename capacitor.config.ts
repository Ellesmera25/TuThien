import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "https://tu-thien.vercel.app";

const config: CapacitorConfig = {
  appId: "vn.tuthien.app",
  appName: "TuThien.vn",
  webDir: "public",
  server: {
    url: serverUrl,
  },
};

export default config;
