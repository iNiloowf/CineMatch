import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ca.cinematch.app",
  appName: "CineMatch",
  webDir: "public",
  server: {
    url: "https://cinematch.ca",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
