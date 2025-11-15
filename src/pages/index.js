import * as React from "react";
import Layout from "../components/Layout";
import TileGrid from "../components/TileGrid";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";

const IndexPage = () => {
  const { t } = useTranslation();

  const user = {
    isAuthenticated: false,
    groups: [],
  };

  const hasDesignAccess = user.groups.includes("dhc-users");
  const hasOperateAccess = user.groups.includes("dhc-operators");

  const generalTiles = [
    {
      id: "about",
      title: t("tile.about.title"),
      description: t("tile.about.desc"),
      icon: "ℹ️",
      url: "/about",
      status: "available",
    },
    {
      id: "signin",
      title: t("tile.signin.title"),
      description: t("tile.signin.desc"),
      icon: "🔐",
      url: "/signin",
      status: "available",
    },
    {
      id: "signup",
      title: t("tile.signup.title"),
      description: t("tile.signup.desc"),
      icon: "🧑‍💻",
      url: "/signup",
      status: "available",
    },
    {
      id: "coffee",
      title: t("tile.coffee.title"),
      description: t("tile.coffee.desc"),
      icon: "☕",
      url: "https://buymeacoffee.com/dlab5",
      status: "available",
    },
  ];

  const designTiles = [
    {
      id: "design-demo",
      title: t("tile.design.demo.title"),
      description: t("tile.design.demo.desc"),
      icon: "🏗️",
      url: "https://designer.digitalhome.cloud/demo",
      status: hasDesignAccess ? "available" : "restricted",
    },
  ];

  const operateTiles = [
    {
      id: "operate-demo",
      title: t("tile.operate.demo.title"),
      description: t("tile.operate.demo.desc"),
      icon: "⚙️",
      url: "https://operator.digitalhome.cloud/demo",
      status: hasOperateAccess ? "available" : "restricted",
    },
  ];

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">{t("app.title")}</h1>
          <p className="dhc-hero-subtitle">{t("app.subtitle")}</p>
        </section>

        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">{t("section.general")}</h2>
          <TileGrid tiles={generalTiles} />
        </section>

        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">{t("section.design")}</h2>
          <TileGrid tiles={designTiles} />
        </section>

        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">{t("section.operate")}</h2>
          <TileGrid tiles={operateTiles} />
        </section>
      </main>
    </Layout>
  );
};

export default IndexPage;

// 👇 This is required for gatsby-plugin-react-i18next
export const query = graphql`
  query IndexPageQuery($language: String!) {
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
