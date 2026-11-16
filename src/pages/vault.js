import * as React from "react";
import { graphql, navigate } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import HomeVault from "../components/HomeVault";
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

// Vault — a home's photos and documents, grouped by configuration version
// (darkfactory ADR 0019), inside the Overview left-rail shell.
const VaultPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  return (
    <OverviewShell active="vault" title="Vault">
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t("homeVault.title", { defaultValue: "Vault" })}
          </h1>
          <p className="ov-page-sub">
            {t("homeVault.subtitle", {
              defaultValue:
                "Photos and documents of the active home, grouped by the configuration they document. Only the home's owners see them.",
            })}
          </p>
        </div>
        <HomeVault />
      </div>
    </OverviewShell>
  );
};

export default VaultPage;

export const query = graphql`
  query VaultPageQuery($language: String!) {
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
