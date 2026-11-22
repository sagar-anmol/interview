"use client";

import * as React from "react";
import { startBackgroundDownload } from "@/lib/integration/integrationManager";

export function IntegrationStarter() {
  React.useEffect(() => {
    startBackgroundDownload();
  }, []);
  return null;
}
