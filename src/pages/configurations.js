import * as React from "react";
import { graphql, navigate } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import HomeConfigurations from "../components/HomeConfigurations";
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

// Configurations — a home's live configuration, earlier versions and planning
// options (darkfactory ADR 0018), inside the Overview left-rail shell.
const ConfigurationsPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  return (
    <OverviewShell active="configurations" title="Configurations">
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t("homeConfig.title", { defaultValue: "Configurations" })}
          </h1>
          <p className="ov-page-sub">
            {t("homeConfig.subtitle", {
              defaultValue:
                "The installation of the active home: the live configuration, the versions before it and the planning options. Compare any two.",
            })}
          </p>
        </div>
        <HomeConfigurations />
      </div>
    </OverviewShell>
  );
};

export default ConfigurationsPage;

export const query = graphql`
  query ConfigurationsPageQuery($language: String!) {
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
