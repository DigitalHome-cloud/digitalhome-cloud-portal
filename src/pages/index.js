import * as React from "react";
import { graphql } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import OverviewLoop from "../components/OverviewLoop";

// Self-hosted IBM Plex (scoped-theme fonts) + the scoped Overview stylesheet.
import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";

// Portal landing — the "continuous loop" Overview dashboard. Self-contained
// left-rail shell + hero (green/IBM-Plex theme scoped under .ov); does not use
// the shared Layout/Header. Auth-aware guest vs signed-in states.
const IndexPage = () => (
  <OverviewShell>
    <OverviewLoop />
  </OverviewShell>
);

export default IndexPage;

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
