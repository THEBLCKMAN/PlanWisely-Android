import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "za.co.planwisely.app",
  appName: "PlanWisely",
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
  },
};

export default config;
