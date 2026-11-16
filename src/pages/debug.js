import * as React from "react";
import Layout from "../components/Layout";
import { graphql, navigate } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

// Admin-only debug page: browse the S3 bucket, list DynamoDB tables + Cognito
// groups, and deep-link to the AWS console. Backed by the dhc-admins-only
// adminDebug Lambda (read-only). All four queries return AWSJSON → parse.

const client = generateClient();
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const gql = async (query, variables) => {
  const r = await client.graphql({ query, variables, authMode: "userPool" });
  return parse(r.data[Object.keys(r.data)[0]]);
};
const Q_S3 = `query D($prefix: String) { debugS3(prefix: $prefix) }`;
const Q_TABLES = `query { debugTables }`;
const Q_COGNITO = `query { debugCognito }`;
const Q_CONSOLE = `query { debugConsole }`;

const card = {
  border: "1px solid #2b3346",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.02)",
  padding: "1rem 1.1rem",
  marginBottom: "1.2rem",
};
const mono = { fontFamily: "monospace", fontSize: "0.8rem" };
const link = { color: "#6c9dff" };
const clickable = { ...link, cursor: "pointer" };
const fmtBytes = (b) =>
  b == null
    ? "—"
    : b < 1024
    ? `${b} B`
    : b < 1048576
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / 1048576).toFixed(1)} MB`;

const DebugPage = () => {
  const { isAuthenticated, isLoading, hasGroup } = useAuth();
  const isAdmin = hasGroup && hasGroup("dhc-admins");

  const [prefix, setPrefix] = React.useState("");
  const [s3, setS3] = React.useState(null);
  const [tables, setTables] = React.useState(null);
  const [cognito, setCognito] = React.useState(null);
  const [cons, setCons] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  React.useEffect(() => {
    if (!isAdmin) return;
    gql(Q_TABLES)
      .then(setTables)
      .catch((e) => setErr(String(e)));
    gql(Q_COGNITO)
      .then(setCognito)
      .catch((e) => setErr(String(e)));
    gql(Q_CONSOLE)
      .then(setCons)
      .catch((e) => setErr(String(e)));
  }, [isAdmin]);

  React.useEffect(() => {
    if (!isAdmin) return;
    gql(Q_S3, { prefix })
      .then(setS3)
      .catch((e) => setErr(String(e)));
  }, [isAdmin, prefix]);

  if (!isLoading && isAuthenticated && !isAdmin) {
    return (
      <Layout>
        <main className="dhc-main">
          <section className="dhc-hero">
            <h1 className="dhc-hero-title">Debug</h1>
            <p className="dhc-hero-subtitle">
              Restricted to administrators (dhc-admins).
            </p>
          </section>
        </main>
      </Layout>
    );
  }

  const segs = prefix ? prefix.replace(/\/$/, "").split("/") : [];
  const crumbTo = (i) => segs.slice(0, i + 1).join("/") + "/";

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero" style={{ paddingBottom: "0.5rem" }}>
          <h1 className="dhc-hero-title">Debug</h1>
          <p className="dhc-hero-subtitle">
            Read-only inspection of the platform's AWS state (dhc-admins).
            Changes happen in the AWS console.
          </p>
        </section>
        {err && <p className="dhc-error">{err}</p>}

        {/* ── S3 browser ── */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>S3 · {s3?.bucket || "…"}</h3>
          <div style={{ ...mono, marginBottom: "0.6rem" }}>
            <span style={clickable} onClick={() => setPrefix("")}>
              (root)
            </span>
            {segs.map((seg, i) => (
              <span key={i}>
                {" / "}
                <span style={clickable} onClick={() => setPrefix(crumbTo(i))}>
                  {seg}
                </span>
              </span>
            ))}
          </div>
          {s3 ? (
            <div className="tablewrap" style={{ overflowX: "auto" }}>
              <table className="dhc-manager-table" style={{ width: "100%" }}>
                <tbody>
                  {(s3.folders || []).map((f) => (
                    <tr key={f}>
                      <td>
                        <span style={clickable} onClick={() => setPrefix(f)}>
                          📁 {f.replace(prefix, "")}
                        </span>
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                  {(s3.objects || []).map((o) => (
                    <tr key={o.key}>
                      <td style={mono}>{o.key.replace(prefix, "")}</td>
                      <td style={{ textAlign: "right" }}>{fmtBytes(o.size)}</td>
                      <td style={{ fontSize: "0.75rem", color: "#6c7689" }}>
                        {o.lastModified?.slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                  {!(s3.folders || []).length && !(s3.objects || []).length && (
                    <tr>
                      <td colSpan={3} style={{ color: "#9ca3af" }}>
                        empty
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {s3.truncated && (
                <p style={{ fontSize: "0.75rem", color: "#e6a13a" }}>
                  … truncated (first 1000)
                </p>
              )}
            </div>
          ) : (
            <p>Loading…</p>
          )}
        </div>

        {/* ── DynamoDB ── */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            DynamoDB tables {tables && `(${tables.tables.length})`}
          </h3>
          {tables ? (
            <div className="tablewrap" style={{ overflowX: "auto" }}>
              <table className="dhc-manager-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Items (~)</th>
                    <th>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.tables.map((t) => (
                    <tr key={t.name}>
                      <td style={mono}>{t.name}</td>
                      <td style={{ textAlign: "right" }}>
                        {t.itemCount ?? "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {fmtBytes(t.sizeBytes)}
                      </td>
                      <td>
                        <span className="dhc-nav-pill">
                          {t.status || t.error || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Loading…</p>
          )}
        </div>

        {/* ── Cognito ── */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>
            Cognito groups {cognito && `· ${cognito.pool}`}
          </h3>
          {cognito ? (
            <>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Your groups:{" "}
                {(cognito.yourGroups || []).map((g) => (
                  <span
                    key={g}
                    className="dhc-nav-pill"
                    style={{ marginRight: "0.3rem" }}
                  >
                    {g}
                  </span>
                ))}
              </p>
              <div className="tablewrap" style={{ overflowX: "auto" }}>
                <table className="dhc-manager-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Members</th>
                      <th>Precedence</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cognito.groups.map((g) => (
                      <tr key={g.group}>
                        <td>
                          <strong>{g.group}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>{g.memberCount}</td>
                        <td>{g.precedence ?? "—"}</td>
                        <td style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                          {g.description || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>Loading…</p>
          )}
        </div>

        {/* ── AWS console links ── */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>AWS console</h3>
          {cons ? (
            <ul style={{ margin: 0, lineHeight: 1.9 }}>
              {[
                ["S3 bucket", cons.s3],
                ["DynamoDB tables", cons.dynamodb],
                ["Cognito user pool", cons.cognito],
                ["AppSync API", cons.appsync],
                ["Amplify · core backend", cons.amplifyCore],
                ["Amplify · portal", cons.amplifyPortal],
              ].map(([label, url]) => (
                <li key={label}>
                  <a style={link} href={url} target="_blank" rel="noreferrer">
                    {label} →
                  </a>
                </li>
              ))}
              <li style={{ fontSize: "0.75rem", color: "#6c7689" }}>
                account {cons.account} · {cons.region}
              </li>
            </ul>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      </main>
    </Layout>
  );
};

export default DebugPage;

export const query = graphql`
  query DebugPageQuery($language: String!) {
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
