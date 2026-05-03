import { useCallback } from "react";
import { useLocation } from "wouter";

type Params = Record<string, string | undefined>;

function parseSearch(search: string): Params {
  const params: Params = {};
  if (!search) return params;
  const s = search.startsWith("?") ? search.slice(1) : search;
  s.split("&").forEach((pair) => {
    const [key, val] = pair.split("=");
    if (key) params[decodeURIComponent(key)] = val ? decodeURIComponent(val) : "";
  });
  return params;
}

function buildSearch(params: Params): string {
  const parts: string[] = [];
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== "" && val !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  });
  return parts.length ? `?${parts.join("&")}` : "";
}

export function useUrlState(defaults: Params = {}): [Params, (updates: Params) => void, () => void] {
  const [location, setLocation] = useLocation();

  const searchStr = typeof window !== "undefined" ? window.location.search : "";
  const current: Params = { ...defaults, ...parseSearch(searchStr) };

  const setParams = useCallback(
    (updates: Params) => {
      const next = { ...current, ...updates };
      const path = location.split("?")[0];
      setLocation(path + buildSearch(next), { replace: true });
    },
    [location, current, setLocation]
  );

  const clearAll = useCallback(() => {
    const path = location.split("?")[0];
    setLocation(path, { replace: true });
  }, [location, setLocation]);

  return [current, setParams, clearAll];
}
