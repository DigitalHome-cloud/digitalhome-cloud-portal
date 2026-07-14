import { useState, useEffect } from "react";

/**
 * getAppUrl.js — Environment namespace routing
 *
 * Detects the current environment (DEV / STAGE / PROD) from
 * window.location.hostname and returns the correct URL for the
 * target app within the same namespace.
 *
 * Duplicated across portal, designer, modeler (no shared package).
 */

const APP_PORTS = {
  portal: 8000,
  designer: 8001,
  modeler: 8002,
};

const APP_HOSTS = {
  portal: "portal.digitalhome.cloud",
  designer: "designer.digitalhome.cloud",
  modeler: "modeler.digitalhome.cloud",
};

/**
 * Detect environment namespace from the current hostname.
 * @returns {"dev"|"stage"|"prod"}
 */
function detectNamespace() {
  if (typeof window === "undefined") return "prod";
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "dev";
  if (hostname.startsWith("stage-")) return "stage";
  return "prod";
}

/**
 * Get the URL for a target app, staying within the same namespace.
 * @param {string} appName — "portal", "designer", or "modeler"
 * @returns {string} — base URL (no trailing slash)
 */
function buildUrl(appName, ns) {
  switch (ns) {
    case "dev":
      return `http://localhost:${APP_PORTS[appName]}`;
    case "stage":
      return `https://stage-${APP_HOSTS[appName]}`;
    default:
      return `https://${APP_HOSTS[appName]}`;
  }
}

export function getAppUrl(appName) {
  return buildUrl(appName, detectNamespace());
}

/**
 * React hook form of getAppUrl — use this for anything that ends up in an
 * href/src attribute. Calling getAppUrl() directly during render is a bug.
 *
 * getAppUrl() reads window.location, which does not exist during Gatsby's
 * build-time render: detectNamespace() falls back to "prod", so the PRODUCTION
 * url is what gets baked into the static HTML. React 18 does not patch
 * mismatched *attributes* during hydration — it keeps the server's value — so
 * a stage or dev build would otherwise point at production forever.
 *
 * The initial state must therefore reproduce the server's value ("prod") even
 * though window exists on the client. If it resolved the real namespace up
 * front, state would already equal the correct url, the effect's setUrl() would
 * be a no-op, React would bail out of the re-render, and the stale prod href
 * baked into the HTML would never be corrected. Resolving only in the effect
 * guarantees a genuine state change → re-render → patched href.
 */
export function useAppUrl(appName) {
  const [url, setUrl] = useState(() => buildUrl(appName, "prod"));
  useEffect(() => {
    setUrl(getAppUrl(appName));
  }, [appName]);
  return url;
}
