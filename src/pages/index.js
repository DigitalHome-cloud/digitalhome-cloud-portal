import * as React from "react";
import Layout from "../components/Layout";
import TileGrid from "../components/TileGrid";

// Placeholder until Cognito is added
// Later you’ll replace these with your Cognito group results
const user = {
  isAuthenticated: false,
  groups: [], // e.g. ["dhc-users", "dhc-core-team"]
};

// -------------------------------
// Tile Definitions by Category
// -------------------------------

const generalTiles = [
  {
    id: "about",
    title: "About DigitalHome.Cloud",
    description: "Learn more about the DHC platform and vision.",
    icon: "ℹ️",
    url: "/about",
    status: "available",
  },
  {
    id: "signin",
    title: "Sign In",
    description: "Access your DigitalHome.Cloud account.",
    icon: "🔐",
    url: "/signin",
    status: "available",
  },
  {
    id: "signup",
    title: "Sign Up",
    description: "Create your DigitalHome.Cloud account.",
    icon: "🧑‍💻",
    url: "/signup",
    status: "available",
  },
  {
    id: "coffee",
    title: "Pay Me a Coffee",
    description: "Support the DigitalHome.Cloud project.",
    icon: "☕",
    url: "https://buymeacoffee.com/dlab5",
    status: "available",
  },
];

// Access-protected DEMO tiles -------------------
const hasDesignAccess = user.groups.includes("dhc-users");
const hasOperateAccess = user.groups.includes("dhc-operators");

// Row 2: Design
const designTiles = [
  {
    id: "design-demo",
    title: "SmartHome Designer DEMO",
    description: "Start designing a sample digital home.",
    icon: "🏗️",
    url: "https://designer.digitalhome.cloud/demo",
    status: hasDesignAccess ? "available" : "restricted",
  },
];

// Row 3: Operate
const operateTiles = [
  {
    id: "operate-demo",
    title: "SmartHome Operator DEMO",
    description: "Operate a simulated smart home.",
    icon: "⚙️",
    url: "https://operator.digitalhome.cloud/demo",
    status: hasOperateAccess ? "available" : "restricted",
  },
];

const IndexPage = () => {
  return (
    <Layout>
      <main className="dhc-main">
        {/* HERO */}
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">DigitalHome.Cloud Portal</h1>
          <p className="dhc-hero-subtitle">
            Your launchpad for designing, managing and operating smart homes.
          </p>
        </section>

        {/* ROW 1 */}
        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">General</h2>
          <TileGrid tiles={generalTiles} />
        </section>

        {/* ROW 2 */}
        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">Design</h2>
          <TileGrid tiles={designTiles} />
        </section>

        {/* ROW 3 */}
        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">Operate</h2>
          <TileGrid tiles={operateTiles} />
        </section>
      </main>
    </Layout>
  );
};

export default IndexPage;

