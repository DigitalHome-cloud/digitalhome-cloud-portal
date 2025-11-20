import * as React from "react";
import Layout from "../components/Layout";
import { Authenticator, ThemeProvider, defaultTheme } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import { useAuth } from "../context/AuthContext";


const myTheme = {
  name: "dhc-theme",
  overrides: [
    {
      colorMode: "light",
      tokens: {
        colors: {
          brand: {
            primary: {
              10: "#0f172a",
              80: "#1d4ed8",
              90: "#1e40af",
            },
          },
        },
        radii: {
          small: "0.5rem",
          medium: "1rem",
        },
      },
    },
  ],
};


const SignInPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      // Already signed in → go back to home
      navigate("/");
    }
  }, [isAuthenticated]);

  return (
    <Layout>
      <main className="dhc-auth-page">
        <h1>{t("tile.signin.title")}</h1>
        <p>{t("tile.signin.desc")}</p>
        <div className="dhc-auth-widget">
          <ThemeProvider theme={{ ...defaultTheme, ...myTheme }}>
            <Authenticator>
              {({ signOut, user }) => (
                <div>
                  <p>
                    {user
                      ? `Signed in as ${user.username}`
                      : "Complete the form to sign in."}
                  </p>
                  {user && (
                    <button
                      type="button"
                      onClick={signOut}
                      className="dhc-nav-link dhc-nav-link-button"
                    >
                      Sign out
                    </button>
                  )}
                </div>
              )}
            </Authenticator>
          </ThemeProvider>
        </div>
      </main>
    </Layout>
  );
};

export default SignInPage;

// Required for gatsby-plugin-react-i18next
export const query = graphql`
  query SignInPageQuery($language: String!) {
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
