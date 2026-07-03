import * as React from "react";
import { graphql, Link } from "gatsby";
import Layout from "../components/Layout";
import SmartHomeManager from "../components/SmartHomeManager";
import { useTranslation } from "gatsby-plugin-react-i18next";

// SmartHome Manager — central admin surface (moved here from the Designer).
// Create / edit / delete DigitalHomes and pick the active one; edge boxes are
// paired on the /link page.
const ManagerPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">
            {t("manager.title", { defaultValue: "SmartHome Manager" })}
          </h1>
          <p className="dhc-hero-subtitle">
            {t("manager.subtitle", {
              defaultValue:
                "Create and manage your Digital Homes, and choose the active one. Add an edge box to pair a local gateway.",
            })}
          </p>
          <p>
            <Link to="/link" className="dhc-button-base dhc-button-secondary">
              {t("manager.addEdge", { defaultValue: "Add an edge box →" })}
            </Link>
          </p>
        </section>
        <SmartHomeManager />
      </main>
    </Layout>
  );
};

export default ManagerPage;

export const query = graphql`
  query ManagerPageQuery($language: String!) {
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
