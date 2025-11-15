import * as React from "react";
import Layout from "../components/Layout";

const AboutPage = () => {
  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">About DigitalHome.Cloud</h1>
          <p className="dhc-hero-subtitle">
            Technology supporting nature, simplicity, and human creativity.
          </p>
        </section>

        <section className="dhc-text-section">
          <p>
            DigitalHome.Cloud is an open, extensible platform designed to help
            people plan, build, and operate smart homes in a holistic and
            sustainable way. The philosophy behind the platform comes from
            <strong> D-LAB-5</strong> — a mindset where technology is a{" "}
            <strong>supporting tool</strong>, never the main driver.
          </p>

          <p>
            Through a combination of semantic models, automation, and intuitive
            design tools, DigitalHome.Cloud aims to connect the digital and
            physical worlds in a way that enhances quality of life, reduces
            complexity, and respects nature.
          </p>

          <h2 className="dhc-section-subtitle">The Vision</h2>
          <p>
            DigitalHome.Cloud is the beginning of a larger ecosystem where
            modern technology, traditional craft, and environmental awareness
            meet. Inspired by the spirit of{" "}
            <strong>“Where roots meet digital”</strong>, the platform grows
            organically: feature by feature, home by home, always keeping
            humans at the center.
          </p>

          <h2 className="dhc-section-subtitle">Open Source & Community</h2>
          <p>
            All core components of the platform are open source under the
            DigitalHome-cloud GitHub organization. Community contributions,
            ideas, and collaborations are encouraged to help create a future
            where smart homes are accessible, sustainable, and user-friendly.
          </p>

          <h2 className="dhc-section-subtitle">Powered by D-LAB-5</h2>
          <p>
            D-LAB-5 is a family-led innovation initiative combining engineering,
            sustainable architecture, design, and nature-inspired problem
            solving. DigitalHome.Cloud is one of the first projects built under
            this umbrella.
          </p>
        </section>
      </main>
    </Layout>
  );
};

export default AboutPage;
