import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate, Link } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { generateClient } from "aws-amplify/api";

// My Edges — step 2 of the two-step pairing. An edge registers to the user on
// /link (no home required); here the user assigns / reassigns each registered
// box to one of their Digital Homes. Inline GraphQL (decoupled from codegen).

const client = generateClient();

const LIST_MY_EDGES = /* GraphQL */ `
  query ListMyEdges {
    listMyEdges {
      edge_id
      home_id
      machine_id
      hostname
      dhe_version
      status
      last_telemetry_at
      linked_at
    }
  }
`;

const LINK_EDGE_TO_HOME = /* GraphQL */ `
  mutation LinkEdgeToHome($edge_id: String!, $home_id: String) {
    linkEdgeToHome(edge_id: $edge_id, home_id: $home_id) {
      edge_id
      home_id
    }
  }
`;

const EdgesPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { userHomes } = useSmartHome();

  const [edges, setEdges] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [choice, setChoice] = React.useState({}); // edge_id -> selected home_id
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.graphql({
        query: LIST_MY_EDGES,
        authMode: "userPool",
      });
      setEdges(res?.data?.listMyEdges || []);
    } catch (err) {
      console.error("listMyEdges failed", err);
      setError(
        t("edges.loadFailed", { defaultValue: "Could not load your edges." })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const linkTo = async (edgeId, homeId) => {
    setBusy(edgeId);
    setError("");
    setMessage("");
    try {
      await client.graphql({
        query: LINK_EDGE_TO_HOME,
        variables: { edge_id: edgeId, home_id: homeId || null },
        authMode: "userPool",
      });
      setMessage(
        homeId
          ? t("edges.linked", {
              defaultValue: "Edge linked to {{home}}.",
              home: homeId,
            })
          : t("edges.unlinked", { defaultValue: "Edge unassigned." })
      );
      await load();
    } catch (err) {
      console.error("linkEdgeToHome failed", err);
      setError(
        t("edges.linkFailed", {
          defaultValue:
            "Could not update the edge. You must own both the edge and the home.",
        })
      );
    } finally {
      setBusy("");
    }
  };

  const shortId = (id) => (id ? id.replace(/^e-/, "").slice(0, 8) : "—");

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">
            {t("edges.title", { defaultValue: "My Edges" })}
          </h1>
          <p className="dhc-hero-subtitle">
            {t("edges.subtitle", {
              defaultValue:
                "Edge boxes registered to your account. Assign each one to a Digital Home.",
            })}
          </p>
          <p>
            <Link to="/link" className="dhc-button-base dhc-button-secondary">
              {t("edges.pairNew", { defaultValue: "Pair a new edge →" })}
            </Link>
          </p>
        </section>

        {error && <p className="dhc-error">{error}</p>}
        {message && <p className="dhc-message">{message}</p>}

        {loading ? (
          <p>{t("edges.loading", { defaultValue: "Loading…" })}</p>
        ) : edges.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>
            {t("edges.empty", {
              defaultValue:
                "No edges registered yet. Pair one from its dashboard, then approve it here.",
            })}
          </p>
        ) : (
          <table className="dhc-manager-table">
            <thead>
              <tr>
                <th>{t("edges.col.box", { defaultValue: "Box" })}</th>
                <th>{t("edges.col.status", { defaultValue: "Status" })}</th>
                <th>{t("edges.col.home", { defaultValue: "Home" })}</th>
                <th>{t("edges.col.assign", { defaultValue: "Assign to home" })}</th>
              </tr>
            </thead>
            <tbody>
              {edges.map((e) => (
                <tr key={e.edge_id}>
                  <td>
                    <strong>{e.hostname || shortId(e.edge_id)}</strong>
                    <br />
                    <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      {e.machine_id || shortId(e.edge_id)}
                      {e.dhe_version ? ` · v${e.dhe_version}` : ""}
                    </span>
                  </td>
                  <td>
                    <span className="dhc-nav-pill">{e.status || "—"}</span>
                  </td>
                  <td>
                    {e.home_id || (
                      <span style={{ color: "#f59e0b" }}>
                        {t("edges.unassigned", { defaultValue: "unassigned" })}
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className="dhc-form-input"
                      style={{ maxWidth: 220, display: "inline-block" }}
                      value={choice[e.edge_id] ?? e.home_id ?? ""}
                      onChange={(ev) =>
                        setChoice((c) => ({
                          ...c,
                          [e.edge_id]: ev.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {t("edges.optUnassign", {
                          defaultValue: "— unassigned —",
                        })}
                      </option>
                      {userHomes.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.id}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="dhc-button-base dhc-button-primary"
                      style={{ marginLeft: "0.4rem" }}
                      disabled={busy === e.edge_id}
                      onClick={() =>
                        linkTo(e.edge_id, choice[e.edge_id] ?? e.home_id ?? "")
                      }
                    >
                      {busy === e.edge_id
                        ? t("edges.saving", { defaultValue: "…" })
                        : t("edges.save", { defaultValue: "Save" })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </Layout>
  );
};

export default EdgesPage;

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
