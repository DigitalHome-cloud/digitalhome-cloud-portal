import * as React from "react";
import { graphql, navigate } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import FleetManager from "../components/FleetManager";
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

// Fleet — Digital Homes and their paired edges in one place, inside the Overview
// left-rail shell. Replaces the separate Manager and Edges screens.
const FleetPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  return (
    <OverviewShell active="fleet" title="Fleet">
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t("fleet.title", { defaultValue: "Fleet" })}
          </h1>
          <p className="ov-page-sub">
            {t("fleet.subtitle", {
              defaultValue:
                "Your Digital Homes and the edge boxes paired to them. Each home lists its edge with status and firmware version. Pair a new edge from the box itself.",
            })}
          </p>
        </div>
        <FleetManager />
      </div>
    </OverviewShell>
  );
};

export default FleetPage;

export const query = graphql`
  query FleetPageQuery($language: String!) {
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
