import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";

const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">{t("about.hero.title")}</h1>
          <p className="dhc-hero-subtitle">
            {t("about.hero.subtitle")}
          </p>
        </section>

        <section className="dhc-text-section">
          <p>{t("about.p1")}</p>
          <p>{t("about.p2")}</p>

          <h2 className="dhc-section-subtitle">
            {t("about.vision.title")}
          </h2>
          <p>{t("about.vision.body")}</p>

          <h2 className="dhc-section-subtitle">
            {t("about.oss.title")}
          </h2>
          <p>{t("about.oss.body")}</p>

          <h2 className="dhc-section-subtitle">
            {t("about.dlab.title")}
          </h2>
          <p>{t("about.dlab.body")}</p>
        </section>
      </main>
    </Layout>
  );
};

export default AboutPage;

// 👇 Required for translations on this page too
export const query = graphql`
  query AboutPageQuery($language: String!) {
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

