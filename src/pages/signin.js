import * as React from "react";
import { graphql, navigate } from "gatsby";
import { useTranslation, useI18next } from "gatsby-plugin-react-i18next";
import { Authenticator, ThemeProvider, translations } from "@aws-amplify/ui-react";
import { I18n } from "aws-amplify/utils";
import "@aws-amplify/ui-react/styles.css";
import OverviewShell from "../components/OverviewShell";
import { useAuth } from "../context/AuthContext";

import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";

// Sign in / create account, in the Overview shell like every other page.
// The Amplify <Authenticator> gets a theme whose tokens are the shell's own
// CSS variables (overview.css), so it follows them. Overriding Amplify's CSS
// variables directly does not work: the derived ones are resolved at :root.
//
// ?mode=signup opens on "Create Account" (the rail's Sign up).
// ?redirect=/link?user_code=… returns there once signed in (edge pairing);
// only same-site paths are honoured, never another origin.

I18n.putVocabularies(translations);

const GREEN = "var(--ov-green)";
const GREEN_HI = "#7fbe8e";
const LINE = "rgba(120, 140, 130, 0.3)";
const ovTheme = {
  name: "dhc-overview",
  tokens: {
    fonts: {
      default: {
        variable: { value: '"IBM Plex Sans", system-ui, sans-serif' },
        static: { value: '"IBM Plex Sans", system-ui, sans-serif' },
      },
    },
    colors: {
      background: {
        primary: { value: "var(--ov-panel)" },
        secondary: { value: "#0d0f0e" },
        tertiary: { value: "var(--ov-rail)" },
      },
      font: {
        primary: { value: "var(--ov-text)" },
        secondary: { value: "var(--ov-muted)" },
        tertiary: { value: "var(--ov-muted)" },
        interactive: { value: GREEN },
        hover: { value: GREEN_HI },
        focus: { value: GREEN_HI },
        active: { value: GREEN_HI },
      },
      border: {
        primary: { value: LINE },
        secondary: { value: "rgba(120, 140, 130, 0.14)" },
        tertiary: { value: LINE },
        focus: { value: GREEN },
      },
      brand: {
        primary: {
          10: { value: "rgba(111, 174, 126, 0.12)" },
          20: { value: "rgba(111, 174, 126, 0.2)" },
          40: { value: "rgba(111, 174, 126, 0.4)" },
          60: { value: "#5d9a6b" },
          80: { value: GREEN },
          90: { value: GREEN_HI },
          100: { value: GREEN_HI },
        },
      },
    },
    radii: { small: { value: "8px" }, medium: { value: "12px" } },
    components: {
      authenticator: {
        router: {
          boxShadow: { value: "none" },
          borderColor: { value: "rgba(120, 140, 130, 0.18)" },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: GREEN },
          color: { value: "var(--ov-rail)" },
          _hover: { backgroundColor: { value: GREEN_HI }, color: { value: "var(--ov-rail)" } },
          _focus: { backgroundColor: { value: GREEN_HI }, color: { value: "var(--ov-rail)" } },
          _active: { backgroundColor: { value: GREEN_HI }, color: { value: "var(--ov-rail)" } },
        },
      },
      tabs: {
        item: {
          color: { value: "var(--ov-muted)" },
          _active: { color: { value: "var(--ov-text)" }, borderColor: { value: GREEN } },
        },
      },
    },
  },
};

const safeRedirect = (raw) => {
  if (!raw) return "/";
  let path;
  try {
    path = decodeURIComponent(raw);
  } catch (_) {
    return "/";
  }
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/";
};

const paramsOf = (location) => new URLSearchParams(location?.search || "");

const SyncAuth = ({ user }) => {
  const { reloadSession } = useAuth();
  React.useEffect(() => {
    if (user) reloadSession();
  }, [user, reloadSession]);
  return null;
};

const SignInPage = ({ location }) => {
  const { t } = useTranslation();
  const { language } = useI18next();
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = React.useState(null);

  React.useEffect(() => {
    I18n.setLanguage(language || "en");
  }, [language]);

  const query = paramsOf(location);
  const redirect = safeRedirect(query.get("redirect"));

  // Read the query after hydration (the page is prerendered without it), and
  // again when the rail switches between Sign in and Sign up.
  React.useEffect(() => {
    setMode(paramsOf(location).get("mode") === "signup" ? "signUp" : "signIn");
  }, [location?.search]);

  React.useEffect(() => {
    if (isAuthenticated) navigate(redirect);
  }, [isAuthenticated, redirect]);

  const signup = mode === "signUp";
  const pairing = redirect.startsWith("/link");

  return (
    <OverviewShell active="signin" title={t(signup ? "tile.signup.title" : "tile.signin.title")}>
      <div className="ov-page ov-auth-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t(signup ? "tile.signup.title" : "tile.signin.title")}
          </h1>
          <p className="ov-page-sub">
            {t(signup ? "tile.signup.desc" : "tile.signin.desc")}
            {pairing && (
              <>
                {" "}
                {t("signin.pairing", "You will return to the edge pairing once signed in.")}
              </>
            )}
          </p>
        </div>
        <div className="ov-auth">
          {mode && (
            <ThemeProvider theme={ovTheme}>
              <Authenticator key={mode} initialState={mode}>
                {({ user }) => (
                  <div className="ov-auth-done">
                    <SyncAuth user={user} />
                    {t("signin.done", "Signed in. One moment…")}
                  </div>
                )}
              </Authenticator>
            </ThemeProvider>
          )}
        </div>
      </div>
    </OverviewShell>
  );
};

export default SignInPage;

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
