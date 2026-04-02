import * as React from "react";
import Layout from "../components/Layout";
import TileGrid from "../components/TileGrid";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { getAppUrl } from "../utils/getAppUrl";

const IndexPage = () => {
  const { t } = useTranslation();
  const { groups, isAuthenticated, user} = useAuth();
  const { activeHome } = useSmartHome();

  const hasDesignAccess = groups.includes("dhc-users");
  const hasOperateAccess = groups.includes("dhc-operators");

  // Try to get a nice display name for the signed-in user
  const username =
    user?.idTokenPayload?.name ||
    user?.idTokenPayload?.email ||
    user?.username ||
    t("tile.signin.defaultName", { defaultValue: "there" });

  const aboutTile = {
    id: "about",
    title: t("tile.about.title"),
    description: t("tile.about.desc"),
    icon: "ℹ️",
    url: "/about",
    status: "available",
  };

  // When NOT signed in → classic "Sign in / Sign up" tile with closed lock.
  // When signed in → becomes an "account" tile with open lock and greeting.
  const signinTile = isAuthenticated
    ? {
        id: "account",
        title: t("tile.signin.signedInTitle", {
          name: username,
          defaultValue: `Hi ${username}`,
        }),
        description: t("tile.signin.signedInDesc", {
          defaultValue: "Manage your account or sign out.",
        }),
        icon: "🔓", // open lock
        url: "/userprofile",
        status: "available",
      }
    : {
        id: "signin",
        title: t("tile.signin.title"),
        description: t("tile.signin.desc"),
        icon: "🔐", // closed lock
        url: "/signin",
        status: "available",
      };

  // Former "signup" tile → now a placeholder for a future blog.
  const blogTile = {
    id: "blog",
    title: t("tile.blog.title", { defaultValue: "Blog (coming soon)" }),
    description: t("tile.blog.desc", {
      defaultValue:
        "Stories, guides, and updates about DigitalHome.Cloud — coming soon.",
    }),
    icon: "📝",
    url: "/blog",
    status: "available",
  };

  const coffeeTile = {
    id: "coffee",
    title: t("tile.coffee.title"),
    description: t("tile.coffee.desc"),
    icon: "☕",
    url: "https://buymeacoffee.com/dlab5",
    status: "available",
  };

  const generalTiles = [aboutTile, signinTile, blogTile, coffeeTile];

  const designerUrl = `${getAppUrl("designer")}?home=${encodeURIComponent(activeHome.id)}`;

  const designTiles = [
    {
      id: "design-demo",
      title: t("tile.design.demo.title"),
      description: t("tile.design.demo.desc"),
      icon: "🏠",
      url: designerUrl,
      status: "available",
    },
    {
      id: "design-real",
      title: "SmartHome Designer",
      description: "Work on your own DigitalHome.Cloud real estates.",
      icon: "🛠️",
      url: hasDesignAccess ? designerUrl : "#",
      status: hasDesignAccess ? "available" : "restricted",
    },
  ];

  const operateTiles = [
    {
      id: "operate-demo",
      title: t("tile.operate.demo.title"),
      description: t("tile.operate.demo.desc"),
      icon: "🎛️",
      url: `#operate?home=${encodeURIComponent(activeHome.id)}`,
      status: "available",
    },
    {
      id: "operate-real",
      title: "SmartHome Operator",
      description: "Monitor and operate real installations.",
      icon: "📡",
      url: hasOperateAccess ? `#operate?home=${encodeURIComponent(activeHome.id)}` : "#",
      status: hasOperateAccess ? "available" : "restricted",
    },
  ];

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-section">
          <h2 className="dhc-section-title">{t("section.general")}</h2>
          <TileGrid tiles={generalTiles} />
        </section>

        <section className="dhc-section">
          <h2 className="dhc-section-title">{t("section.design")}</h2>
          <TileGrid tiles={designTiles} />
        </section>

        <section className="dhc-section">
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
