import * as React from "react";
import { graphql, navigate } from "gatsby";

// Manager has been merged into Fleet (homes + their edges in one place).
const ManagerRedirect = () => {
  React.useEffect(() => {
    navigate("/fleet", { replace: true });
  }, []);
  return null;
};

export default ManagerRedirect;

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
