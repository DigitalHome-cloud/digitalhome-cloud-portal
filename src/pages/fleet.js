import * as React from "react";
import { graphql, navigate } from "gatsby";
import Layout from "../components/Layout";
import FleetManager from "../components/FleetManager";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";

// Fleet — Digital Homes and their paired edges in one place. Replaces the
// separate Manager and Edges screens. Pairing is initiated from the edge box.
const FleetPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">
            {t("fleet.title", { defaultValue: "Fleet" })}
          </h1>
          <p className="dhc-hero-subtitle">
            {t("fleet.subtitle", {
              defaultValue:
                "Your Digital Homes and the edge boxes paired to them. Each home lists its edge with live status and firmware version. Pair a new edge from the box itself.",
            })}
          </p>
        </section>
        <FleetManager />
      </main>
    </Layout>
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
