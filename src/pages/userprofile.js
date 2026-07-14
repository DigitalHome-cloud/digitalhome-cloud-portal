import * as React from "react";
import { graphql, navigate } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";
import OverviewShell from "../components/OverviewShell";
import { useAuth } from "../context/AuthContext";
import { useTier } from "../utils/useTier";
import { generateClient } from "aws-amplify/api";
import { fetchUserAttributes, updateUserAttributes } from "aws-amplify/auth";
import { listUserProfiles } from "../graphql/queries";
import {
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "../graphql/mutations";

import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";

// Profile — inside the Overview shell. Shows identity + group access + all
// Cognito attributes, lets the user edit the standard mutable attributes (name,
// given/family name, locale, phone), and keeps the app-level preference
// (marketing opt-in) stored on the UserProfile model.

const client = generateClient();

// Standard Cognito attributes that are mutable and safe to edit here. Email is
// the sign-in alias (verification flow) so it's shown read-only, not edited.
const EDITABLE = [
  ["name", "Name"],
  ["given_name", "First name"],
  ["family_name", "Last name"],
  ["locale", "Locale"],
  ["phone_number", "Phone (E.164, e.g. +49…)"],
];

const muted = { color: "var(--ov-muted)" };
const mono = { fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem" };
const cardStyle = { marginBottom: "1.2rem", flex: "unset" };

const Field = ({ label, value, onChange, placeholder }) => (
  <label
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.3rem",
      fontSize: "0.78rem",
      color: "var(--ov-muted)",
    }}
  >
    {label}
    <input
      className="ov-input"
      style={{ maxWidth: 340 }}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
    />
  </label>
);

const UserProfilePage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, groups, reloadSession } = useAuth();
  const { tier } = useTier();

  const [attrs, setAttrs] = React.useState(null);
  const [attrForm, setAttrForm] = React.useState({});
  const [savingAttrs, setSavingAttrs] = React.useState(false);

  const [profile, setProfile] = React.useState(null);
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);
  const [savingPref, setSavingPref] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  // Cognito attributes
  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetchUserAttributes()
      .then((a) => {
        setAttrs(a);
        const f = {};
        for (const [k] of EDITABLE) f[k] = a[k] || "";
        setAttrForm(f);
      })
      .catch((e) => {
        console.error("fetchUserAttributes failed", e);
        setError("Could not load account attributes.");
      });
  }, [isAuthenticated]);

  // App profile (DDB UserProfile)
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    client
      .graphql({
        query: listUserProfiles,
        variables: { filter: { owner: { eq: user.username } }, limit: 1 },
        authMode: "userPool",
      })
      .then((r) => {
        const p = r?.data?.listUserProfiles?.items?.[0] || null;
        setProfile(p);
        setMarketingOptIn(!!p?.marketingOptIn);
      })
      .catch((e) => console.error("listUserProfiles failed", e));
  }, [isAuthenticated, user]);

  const saveAttrs = async () => {
    setSavingAttrs(true);
    setError("");
    setMessage("");
    try {
      const userAttributes = {};
      for (const [k] of EDITABLE) {
        const v = (attrForm[k] || "").trim();
        if (v !== (attrs?.[k] || "")) userAttributes[k] = v;
      }
      if (!Object.keys(userAttributes).length) {
        setMessage("No attribute changes.");
        setSavingAttrs(false);
        return;
      }
      await updateUserAttributes({ userAttributes });
      setMessage("Account attributes updated.");
      if (reloadSession) await reloadSession();
      setAttrs(await fetchUserAttributes());
    } catch (e) {
      console.error("updateUserAttributes failed", e);
      setError("Could not update attributes: " + (e?.message || String(e)));
    } finally {
      setSavingAttrs(false);
    }
  };

  const savePref = async () => {
    setSavingPref(true);
    setError("");
    setMessage("");
    try {
      if (profile?.id) {
        const r = await client.graphql({
          query: updateUserProfile,
          variables: { input: { id: profile.id, marketingOptIn } },
          authMode: "userPool",
        });
        setProfile(r.data.updateUserProfile);
      } else {
        const r = await client.graphql({
          query: createUserProfile,
          variables: { input: { marketingOptIn } },
          authMode: "userPool",
        });
        setProfile(r.data.createUserProfile);
      }
      setMessage("Preferences saved.");
    } catch (e) {
      console.error("save preferences failed", e);
      setError("Could not save preferences.");
    } finally {
      setSavingPref(false);
    }
  };

  const del = async () => {
    if (!profile?.id) return;
    if (
      !window.confirm(
        "Delete your app profile record? Your account and sign-in are not affected."
      )
    )
      return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await client.graphql({
        query: deleteUserProfile,
        variables: { input: { id: profile.id } },
        authMode: "userPool",
      });
      setProfile(null);
      setMarketingOptIn(false);
      setMessage("App profile deleted.");
    } catch (e) {
      console.error("delete profile failed", e);
      setError("Could not delete profile.");
    } finally {
      setDeleting(false);
    }
  };

  const sub = attrs?.sub || user?.idTokenPayload?.sub;
  const email = attrs?.email || user?.idTokenPayload?.email;
  const verified =
    attrs?.email_verified === "true" || attrs?.email_verified === true;

  return (
    <OverviewShell active="account" title="Profile">
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">
            {t("userprofile.title", { defaultValue: "Your profile" })}
          </h1>
          <p className="ov-page-sub">
            {t("userprofile.subtitle", {
              defaultValue:
                "Your account identity, group access, and editable Cognito attributes.",
            })}
          </p>
        </div>

        {error && <p className="ov-err">{error}</p>}
        {message && <p className="ov-msg">{message}</p>}

        {/* Identity & access */}
        <div className="ov-info-card" style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>
            Identity &amp; access
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "0.5rem 1rem",
              fontSize: "0.85rem",
              alignItems: "center",
            }}
          >
            <span style={muted}>Username</span>
            <span>{user?.username || "—"}</span>
            <span style={muted}>User ID</span>
            <span style={mono}>{sub || "—"}</span>
            <span style={muted}>Email</span>
            <span>
              {email || "—"}{" "}
              {verified ? (
                <span
                  className="ov-estat ov-estat--up"
                  style={{ marginLeft: 6 }}
                >
                  <span className="ov-estat-dot" />
                  verified
                </span>
              ) : (
                <span style={{ color: "#f59e0b" }}>unverified</span>
              )}
            </span>
            <span style={muted}>Tier</span>
            <span>
              <span className="ov-pill">{tier || "—"}</span>
            </span>
            <span style={muted}>Groups</span>
            <span>
              {groups?.length ? (
                groups.map((g) => (
                  <span
                    key={g}
                    className="ov-pill"
                    style={{ marginRight: "0.3rem" }}
                  >
                    {g}
                  </span>
                ))
              ) : (
                <span style={muted}>none</span>
              )}
            </span>
          </div>
        </div>

        {/* Editable Cognito attributes */}
        <div className="ov-info-card" style={cardStyle}>
          <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>
            Account attributes
          </h3>
          <p style={{ ...muted, fontSize: "0.78rem", margin: "0 0 0.8rem" }}>
            Stored in Cognito. Email is your sign-in and is managed separately.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
            {EDITABLE.map(([k, label]) => (
              <Field
                key={k}
                label={label}
                value={attrForm[k] ?? ""}
                placeholder={k === "phone_number" ? "+491234567890" : ""}
                onChange={(e) =>
                  setAttrForm((f) => ({ ...f, [k]: e.target.value }))
                }
              />
            ))}
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <button
              type="button"
              className="ov-btn ov-btn--primary"
              disabled={savingAttrs || !attrs}
              onClick={saveAttrs}
            >
              {savingAttrs ? "Saving…" : "Save attributes"}
            </button>
          </div>
        </div>

        {/* All attributes (read-only details) */}
        {attrs && (
          <div className="ov-info-card" style={cardStyle}>
            <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>
              All attributes
            </h3>
            <div className="ov-tablewrap">
              <table className="ov-table">
                <tbody>
                  {Object.entries(attrs).map(([k, v]) => (
                    <tr key={k}>
                      <td
                        style={{
                          ...mono,
                          color: "var(--ov-muted)",
                          width: 200,
                        }}
                      >
                        {k}
                      </td>
                      <td style={mono}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* App preferences */}
        <div className="ov-info-card" style={{ flex: "unset" }}>
          <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>App preferences</h3>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            I&rsquo;d like to receive product updates and news.
          </label>
          <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="ov-btn ov-btn--primary"
              disabled={savingPref}
              onClick={savePref}
            >
              {savingPref ? "Saving…" : "Save preferences"}
            </button>
            {profile?.id && (
              <button
                type="button"
                className="ov-btn ov-btn--danger"
                disabled={deleting}
                onClick={del}
              >
                {deleting ? "Deleting…" : "Delete app profile"}
              </button>
            )}
          </div>
        </div>
      </div>
    </OverviewShell>
  );
};

export default UserProfilePage;

export const query = graphql`
  query UserProfilePageQuery($language: String!) {
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
