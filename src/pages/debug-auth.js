import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { fetchAuthSession } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/api";

import { listUserProfiles } from "../graphql/queries";

const client = generateClient();

function decodeJwt(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode token", e);
    return null;
  }
}

const DebugAuthPage = () => {
  const { t } = useTranslation();
  const auth = useAuth(); // { authState, isAuthenticated, user, groups, isLoading, signOut }
  const { isAuthenticated, user, groups, authState, isLoading } = auth;

  const [idToken, setIdToken] = React.useState(null);
  const [accessToken, setAccessToken] = React.useState(null);
  const [idPayload, setIdPayload] = React.useState(null);
  const [accessPayload, setAccessPayload] = React.useState(null);
  const [sessionError, setSessionError] = React.useState("");
  const [loadingSession, setLoadingSession] = React.useState(true);

  const [testResult, setTestResult] = React.useState(null);
  const [testError, setTestError] = React.useState("");
  const [testLoading, setTestLoading] = React.useState(false);

  // Load tokens via Amplify Auth
  React.useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setLoadingSession(true);
      setSessionError("");
      try {
        const session = await fetchAuthSession();
        if (cancelled) return;

        const id = session?.tokens?.idToken?.toString?.();
        const access = session?.tokens?.accessToken?.toString?.();

        setIdToken(id || null);
        setAccessToken(access || null);

        setIdPayload(decodeJwt(id || ""));
        setAccessPayload(decodeJwt(access || ""));
      } catch (err) {
        console.error("Error fetching auth session", err);
        if (!cancelled) {
          setSessionError(
            err?.message || "Failed to fetch auth session (are you signed in?)."
          );
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRunTestQuery = async () => {
    setTestLoading(true);
    setTestError("");
    setTestResult(null);

    try {
      const result = await client.graphql({
        query: listUserProfiles,
        authMode: "userPool", // IMPORTANT: use Cognito User Pools
        variables: {
          limit: 10,
        },
      });
      setTestResult(result.data || result);
    } catch (err) {
      console.error("Test query error", err);
      setTestError(err?.errors?.[0]?.message || err?.message || "Unknown error");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-section">
          <h1 className="dhc-page-title">Auth / GraphQL Debug</h1>
          <p className="dhc-page-subtitle">
            This page shows your current authentication state, decoded Cognito
            tokens, and a test query against the AppSync GraphQL API.
          </p>

          {/* AuthContext summary */}
          <div className="dhc-debug-card">
            <h2>AuthContext state</h2>
            <ul>
              <li>
                <strong>authState:</strong> {String(authState)}
              </li>
              <li>
                <strong>isLoading:</strong> {String(isLoading)}
              </li>
              <li>
                <strong>isAuthenticated:</strong> {String(isAuthenticated)}
              </li>
              <li>
                <strong>username:</strong>{" "}
                {user?.username ||
                  user?.signInDetails?.loginId ||
                  "(no user loaded)"}
              </li>
              <li>
                <strong>groups:</strong> {groups && groups.length > 0
                  ? groups.join(", ")
                  : "(none)"}
              </li>
            </ul>
          </div>

          {/* Token info */}
          <div className="dhc-debug-grid">
            <div className="dhc-debug-card">
              <h2>ID token</h2>
              {loadingSession ? (
                <p>Loading session…</p>
              ) : sessionError ? (
                <p className="dhc-error">{sessionError}</p>
              ) : idToken ? (
                <>
                  <details open>
                    <summary>Raw token</summary>
                    <pre className="dhc-debug-pre">{idToken}</pre>
                  </details>
                  <details open>
                    <summary>Decoded payload</summary>
                    <pre className="dhc-debug-pre">
                      {JSON.stringify(idPayload, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <p>No ID token found (not signed in?).</p>
              )}
            </div>

            <div className="dhc-debug-card">
              <h2>Access token</h2>
              {loadingSession ? (
                <p>Loading session…</p>
              ) : accessToken ? (
                <>
                  <details>
                    <summary>Raw token</summary>
                    <pre className="dhc-debug-pre">{accessToken}</pre>
                  </details>
                  <details open>
                    <summary>Decoded payload</summary>
                    <pre className="dhc-debug-pre">
                      {JSON.stringify(accessPayload, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <p>No access token found.</p>
              )}
            </div>
          </div>

          {/* Test GraphQL query */}
          <div className="dhc-debug-card">
            <h2>Test GraphQL query (listUserProfiles)</h2>
            <p>
              Calls <code>listUserProfiles</code> with{" "}
              <code>authMode: "userPool"</code>. You should see either your own
              profile(s) or an empty list, never a 401 if tokens are valid.
            </p>
            <button
              type="button"
              onClick={handleRunTestQuery}
              className="dhc-nav-link dhc-nav-link-button"
              disabled={testLoading}
            >
              {testLoading ? "Running…" : "Run test query"}
            </button>

            {testError && (
              <p className="dhc-error" style={{ marginTop: "1rem" }}>
                Error: {testError}
              </p>
            )}

            {testResult && (
              <details open style={{ marginTop: "1rem" }}>
                <summary>Result</summary>
                <pre className="dhc-debug-pre">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <div className="dhc-debug-note">
            <p>
              Tip: If you ever see a <code>401</code> from AppSync again, check:
            </p>
            <ul>
              <li>
                Whether <code>authMode: "userPool"</code> is used in your GraphQL
                calls.
              </li>
              <li>
                That the ID token has not expired (see{" "}
                <code>exp</code> claim above).
              </li>
              <li>
                That the <code>cognito:username</code> matches the{" "}
                <code>owner</code> field you expect for your data.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default DebugAuthPage;

// Required for gatsby-plugin-react-i18next
export const query = graphql`
  query DebugAuthPageQuery($language: String!) {
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
