import * as React from "react";
import { graphql, navigate } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import DeviceCatalogue from "../components/DeviceCatalogue";
import DeviceInventoryManager from "../components/DeviceInventoryManager";
import DeviceInbox from "../components/DeviceInbox";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";

import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";
import "../styles/inventory.css";

// Device Inventory — central admin surface, inside the Overview left-rail shell.
// Three tabs: the devices of the active home, the global catalogue, CSV import.
const TABS = [
  ["inventory", "inventory.tab.inventory", "My devices"],
  ["catalogue", "inventory.tab.catalogue", "Catalogue"],
  ["inbox", "inventory.tab.inbox", "Import (CSV)"],
];

const InventoryPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const [tab, setTab] = React.useState("inventory");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  return (
    <OverviewShell
      active="inventory"
      title={t("inventory.title", { defaultValue: "Device Inventory" })}
    >
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t("inventory.title", { defaultValue: "Device Inventory" })}
          </h1>
          <p className="ov-page-sub">
            {t("inventory.subtitle", {
              defaultValue:
                "Manage the devices in your active home, the global device catalogue, and CSV imports.",
            })}
          </p>
        </div>

        <div className="ov-tabs" role="tablist">
          {TABS.map(([id, key, fallback]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "ov-tab ov-tab--active" : "ov-tab"}
              onClick={() => setTab(id)}
            >
              {t(key, { defaultValue: fallback })}
            </button>
          ))}
        </div>

        {tab === "inventory" && <DeviceInventoryManager />}
        {tab === "catalogue" && <DeviceCatalogue />}
        {tab === "inbox" && <DeviceInbox />}
      </div>
    </OverviewShell>
  );
};

export default InventoryPage;

export const query = graphql`
  query InventoryPageQuery($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
`;
