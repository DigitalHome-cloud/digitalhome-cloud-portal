import * as React from "react";
import { graphql, navigate } from "gatsby";

// Edges have been merged into Fleet (each edge nests under its home).
const EdgesRedirect = () => {
  React.useEffect(() => {
    navigate("/fleet", { replace: true });
  }, []);
  return null;
};

export default EdgesRedirect;

export const query = graphql`
  query EdgesPageQuery($language: String!) {
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
