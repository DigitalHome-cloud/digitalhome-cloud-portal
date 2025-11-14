import * as React from "react";
import Layout from "../components/Layout";
import TileGrid from "../components/TileGrid";

const tiles = [
  {
    id: "smarthome-designer",
    title: "DHC SmartHome Designer",
    description: "Design and configure your digital homes from the DHC ontology.",
    icon: "🏠",
    url: "https://designer.digitalhome.cloud", // placeholder
    status: "available",
  },
  {
    id: "ontology-designer",
    title: "DHC Ontology Designer",
    description: "Create and evolve the DHC core ontology and equipment libraries.",
    icon: "🧠",
    url: "https://ontology.digitalhome.cloud", // placeholder
    status: "restricted", // core team only, later via Cognito
  },
  {
    id: "docs",
    title: "Docs & Ontology",
    description: "Explore the semantic core, Brick alignment and technical docs.",
    icon: "📘",
    url: "https://github.com/DigitalHome-cloud",
    status: "available",
  },
  {
    id: "operator",
    title: "SmartHome Operator",
    description: "Monitor and operate your homes (coming soon).",
    icon: "🤖",
    url: "#",
    status: "coming-soon",
  },
];

const IndexPage = () => {
  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">DigitalHome.Cloud Portal</h1>
          <p className="dhc-hero-subtitle">
            Your launchpad for designing, managing and operating smart homes.
          </p>
        </section>

        <section className="dhc-tiles-section">
          <h2 className="dhc-section-title">Apps</h2>
          <TileGrid tiles={tiles} />
        </section>
      </main>
    </Layout>
  );
};

export default IndexPage;
