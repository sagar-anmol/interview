"use client";

import { useEffect, useState } from "react";

function pathSegment(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname.split("/").filter(Boolean).pop() ?? "";
}

/**
 * Reads the final path segment of the current URL. Returns "" during SSR and
 * hydration, then resolves to the real segment via an effect after mount so
 * SSR and hydration render identically.
 */
export function useLocationId(): string {
  const [id, setId] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(pathSegment());
    const onPop = () => setId(pathSegment());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return id;
}
