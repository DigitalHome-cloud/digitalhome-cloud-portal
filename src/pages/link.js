import * as React from "react";
import OverviewShell from "../components/OverviewShell";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate, Link } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";
import "../styles/link.css";
import { graphqlWithFallback, kindOf } from "../utils/edgeKind";

// Edge ↔ Cloud pairing approval page (DH-SPEC-100 / edge-cloud-api.md §2),
// in the Overview rail shell (Manage → Link an edge).
//
// An edge box shows a QR code / user_code on its local dashboard; the homeowner
// opens verification_uri_complete (this page, with ?user_code=…), signs in with
// Cognito, sanity-checks the box's device_info, picks (or creates) the home to
// link it to, and Approves. Approval flips the pending device_code to
// "approved" so the box's next /token poll returns a device_token.
//
// GraphQL operations are inlined (rather than imported from generated
// src/graphql/*) so this page is decoupled from codegen naming and keeps
// working across the Portal → core-backend repoint.

const client = generateClient();

const DESCRIBE_FIELDS = `
      status
      hostname
      lan_ip
      dhe_version
      machine_id`;
const DESCRIBE_DEVICE_CODE = /* GraphQL */ `
  query DescribeDeviceCode($user_code: String!) {
    describeDeviceCode(user_code: $user_code) {${DESCRIBE_FIELDS}
      edge_kind
    }
  }
`;
const DESCRIBE_DEVICE_CODE_OLD = /* GraphQL */ `
  query DescribeDeviceCode($user_code: String!) {
    describeDeviceCode(user_code: $user_code) {${DESCRIBE_FIELDS}
    }
  }
`;

const LIST_DIGITAL_HOMES = /* GraphQL */ `
  query ListDigitalHomes {
    listDigitalHomes {
      items {
        smartHomeId
        city
        addressLine1
        isDemo
      }
    }
  }
`;

const APPROVE_DEVICE_CODE = /* GraphQL */ `
  mutation ApproveDeviceCode($user_code: String!, $home_id: String) {
    approveDeviceCode(user_code: $user_code, home_id: $home_id) {
      status
      home_id
    }
  }
`;

const DENY_DEVICE_CODE = /* GraphQL */ `
  mutation DenyDeviceCode($user_code: String!) {
    denyDeviceCode(user_code: $user_code) {
      status
    }
  }
`;

const INITIATE_DIGITAL_HOME = /* GraphQL */ `
  mutation InitiateDigitalHome(
    $country: String!
    $postalCode: String!
    $streetCode: String!
    $houseNumber: String!
    $suffix: String!
    $city: String!
    $addressLine1: String!
    $isDemo: Boolean!
  ) {
    initiateDigitalHome(
      country: $country
      postalCode: $postalCode
      streetCode: $streetCode
      houseNumber: $houseNumber
      suffix: $suffix
      city: $city
      addressLine1: $addressLine1
      isDemo: $isDemo
    ) {
      smartHomeId
      createdAt
    }
  }
`;

const EMPTY_CREATE = {
  country: "",
  postalCode: "",
  streetCode: "",
  houseNumber: "",
  suffix: "01",
  city: "",
  addressLine1: "",
};

const LinkPage = ({ location }) => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  // user_code from ?user_code=…, kept editable so the user can also type it in.
  const initialUserCode = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    const search = location?.search || window.location.search || "";
    return (new URLSearchParams(search).get("user_code") || "").toUpperCase();
  }, [location]);

  const [userCode, setUserCode] = React.useState(initialUserCode);
  const [device, setDevice] = React.useState(null); // { status, hostname, ... }
  const [loadingDevice, setLoadingDevice] = React.useState(false);

  const [homes, setHomes] = React.useState([]);
  const [selectedHome, setSelectedHome] = React.useState("");
  const [loadingHomes, setLoadingHomes] = React.useState(false);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState(EMPTY_CREATE);
  const [creating, setCreating] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [outcome, setOutcome] = React.useState(""); // "approved" | "denied"
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  // Require authentication (Portal uses the in-app <Authenticator> at /signin,
  // not a Cognito Hosted UI redirect).
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const back =
        typeof window !== "undefined"
          ? encodeURIComponent(
              window.location.pathname + window.location.search
            )
          : "";
      navigate(`/signin${back ? `?redirect=${back}` : ""}`);
    }
  }, [isLoading, isAuthenticated]);

  // Load the box's device_info for the current user_code.
  const loadDevice = React.useCallback(
    async (code) => {
      if (!code) {
        setDevice(null);
        return;
      }
      setLoadingDevice(true);
      setError("");
      try {
        const res = await graphqlWithFallback(
          client,
          { query: DESCRIBE_DEVICE_CODE, variables: { user_code: code }, authMode: "userPool" },
          DESCRIBE_DEVICE_CODE_OLD
        );
        setDevice(res?.data?.describeDeviceCode || null);
      } catch (err) {
        console.error("describeDeviceCode failed", err);
        setDevice(null);
        setError(
          t("link.notFound", {
            defaultValue:
              "No edge is waiting with that code. Check it on the edge's page: a code is valid for 10 minutes, then the edge needs a new one.",
          })
        );
      } finally {
        setLoadingDevice(false);
      }
    },
    [t]
  );

  // Load the user's homes for the approval dropdown. Owner filtering happens
  // server-side via the DigitalHome @auth rule, so this returns only the
  // caller's homes.
  const loadHomes = React.useCallback(async () => {
    setLoadingHomes(true);
    try {
      const res = await client.graphql({
        query: LIST_DIGITAL_HOMES,
        authMode: "userPool",
      });
      const items = res?.data?.listDigitalHomes?.items || [];
      setHomes(items);
      setSelectedHome((prev) => prev || (items[0]?.smartHomeId ?? ""));
    } catch (err) {
      console.error("listDigitalHomes failed", err);
    } finally {
      setLoadingHomes(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      loadHomes();
      if (initialUserCode) loadDevice(initialUserCode);
    }
  }, [isAuthenticated, initialUserCode, loadHomes, loadDevice]);

  const reset = () => {
    setOutcome("");
    setDevice(null);
    setUserCode("");
    setError("");
    setMessage("");
  };

  const handleLookup = (event) => {
    event.preventDefault();
    setOutcome("");
    setMessage("");
    loadDevice(userCode.trim().toUpperCase());
  };

  const handleCreateChange = (field) => (event) => {
    const value =
      field === "country" || field === "streetCode"
        ? event.target.value.toUpperCase()
        : event.target.value;
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateHome = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const res = await client.graphql({
        query: INITIATE_DIGITAL_HOME,
        variables: { ...createForm, isDemo: false },
        authMode: "userPool",
      });
      const created = res?.data?.initiateDigitalHome;
      if (created?.smartHomeId) {
        await loadHomes();
        setSelectedHome(created.smartHomeId);
        setShowCreate(false);
        setCreateForm(EMPTY_CREATE);
        setMessage(
          t("link.homeCreated", {
            defaultValue: "Home {{id}} created and selected.",
            id: created.smartHomeId,
          })
        );
      }
    } catch (err) {
      console.error("initiateDigitalHome failed", err);
      setError(
        t("link.createFailed", {
          defaultValue:
            "Could not create the home. Check the fields and retry.",
        })
      );
    } finally {
      setCreating(false);
    }
  };

  const isPro = !!device && kindOf(device) === "pro";

  const handleApprove = async () => {
    // Two-step: the home is optional here. Approve with no home to register the
    // box to your account and assign it later from "My Edges".
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await client.graphql({
        query: APPROVE_DEVICE_CODE,
        variables: {
          user_code: userCode.trim().toUpperCase(),
          // a pro edge works for all your homes: it is linked to none (ADR 0020)
          home_id: isPro ? null : selectedHome || null,
        },
        authMode: "userPool",
      });
      setOutcome("approved");
    } catch (err) {
      console.error("approveDeviceCode failed", err);
      setError(
        t("link.approveFailed", {
          defaultValue:
            "Approval failed. The code may have expired, or you may not own that home.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await client.graphql({
        query: DENY_DEVICE_CODE,
        variables: { user_code: userCode.trim().toUpperCase() },
        authMode: "userPool",
      });
      setOutcome("denied");
    } catch (err) {
      console.error("denyDeviceCode failed", err);
      setError(
        t("link.denyFailed", { defaultValue: "Could not deny the edge." })
      );
    } finally {
      setSubmitting(false);
    }
  };

    const T = (key, defaultValue, opts) => t(key, { defaultValue, ...(opts || {}) });
  const title = T("link.title", "Link an edge");
  const pending = device && device.status === "pending";
  const chosen = homes.find((h) => h.smartHomeId === selectedHome);

  const stepCls = (n) =>
    "lk-step" +
    (n === 1 && device ? " lk-step--done" : "") +
    (n === 2 && pending ? " lk-step--done" : "") +
    (n === 3 && !pending ? " lk-step--off" : "");

  return (
    <OverviewShell active="link" title={title}>
      <div className="ov-page">
        <div className="ov-page-head">
          <h1 className="ov-page-title">{title}</h1>
          <p className="ov-page-sub">
            {T(
              "link.subtitle",
              "An edge (the home's box, or an app on a computer) shows a pairing code. Approve it here and the edge is linked to your account and, if you choose, to one of your homes. No password is typed on the edge."
            )}
          </p>
        </div>

        {(isLoading || !isAuthenticated) && (
          <p className="ov-page-sub">{T("link.loading", "Loading…")}</p>
        )}

        {isAuthenticated && outcome && (
          <div className={"lk-done" + (outcome === "denied" ? " lk-done--denied" : "")}>
            <h2>
              {outcome === "approved"
                ? T("link.approvedTitle", "Approved")
                : T("link.deniedTitle", "Denied")}
            </h2>
            <p>
              {outcome === "approved"
                ? T(
                    "link.approved",
                    "The edge finishes linking within a few seconds: its page shows the connection as linked."
                  )
                : T(
                    "link.denied",
                    "The edge shows that the pairing was denied. To try again, start a new pairing on the edge."
                  )}
            </p>
            <div className="lk-actions">
              {outcome === "approved" && (
                <Link className="ov-btn ov-btn--primary" to="/fleet">
                  {T("link.toFleet", "See it in Fleet")}
                </Link>
              )}
              <button type="button" className="ov-btn ov-btn--ghost" onClick={reset}>
                {T("link.another", "Link another edge")}
              </button>
            </div>
          </div>
        )}

        {isAuthenticated && !outcome && (
          <div className="lk-steps">
            {/* 1 — the code */}
            <section className={stepCls(1)}>
              <div className="lk-step-head">
                <span className="lk-num">1</span>
                <span className="lk-step-title">{T("link.step.code", "Pairing code")}</span>
              </div>
              <p className="lk-step-hint">
                {T(
                  "link.codeHint",
                  "The edge shows it under Connections after “Add connection”. A link from the edge fills it in; it is valid for 10 minutes."
                )}
              </p>
              <form className="lk-row" onSubmit={handleLookup}>
                <input
                  className="ov-input lk-code"
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-1234"
                  aria-label={T("link.step.code", "Pairing code")}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="ov-btn ov-btn--ghost"
                  disabled={loadingDevice || !userCode.trim()}
                >
                  {loadingDevice ? T("link.checking", "Checking…") : T("link.check", "Check code")}
                </button>
              </form>
              {error && !device && <p className="ov-err">{error}</p>}
            </section>

            {/* 2 — the edge */}
            <section className={stepCls(2)}>
              <div className="lk-step-head">
                <span className="lk-num">2</span>
                <span className="lk-step-title">{T("link.deviceHeading", "Is this your edge?")}</span>
                {device && device.status && (
                  <span className="ov-pill">{T(`link.status.${device.status}`, device.status)}</span>
                )}
              </div>
              {device ? (
                <dl className="lk-facts">
                  <dt>{T("link.hostname", "Computer")}</dt>
                  <dd>{device.hostname || "—"}</dd>
                  <dt>{T("link.lanIp", "Address on its network")}</dt>
                  <dd>{device.lan_ip || "—"}</dd>
                  <dt>{T("link.dheVersion", "Software")}</dt>
                  <dd>{device.dhe_version || "—"}</dd>
                </dl>
              ) : (
                <p className="lk-step-hint">
                  {T("link.deviceWait", "Check a code to see which edge asks to be linked.")}
                </p>
              )}
              {device && !pending && (
                <p className="ov-err">
                  {T("link.alreadyResolved", "This code was already {{status}}. Start a new pairing on the edge.", {
                    status: T(`link.status.${device.status}`, device.status),
                  })}
                </p>
              )}
            </section>

            {/* 3 — the home, then approve */}
            <section className={stepCls(3)}>
              <div className="lk-step-head">
                <span className="lk-num">3</span>
                <span className="lk-step-title">{T("link.step.home", "Home")}</span>
              </div>
              {isPro ? (
                <p className="lk-step-hint">
                  {T(
                    "link.proHint",
                    "This is a pro edge: it works for all your homes, so it gets none here. On the edge, attach each workspace to its home; Fleet then lists the homes it works for."
                  )}
                </p>
              ) : (
              <>
              <p className="lk-step-hint">
                {T(
                  "link.homeHint",
                  "The edge works for this home. Without one, the edge is only registered to you; give it a home later in Fleet."
                )}
              </p>
              <div className="lk-homes" role="radiogroup">
                {homes.map((h) => (
                  <button
                    key={h.smartHomeId}
                    type="button"
                    role="radio"
                    aria-checked={selectedHome === h.smartHomeId}
                    className={"ov-pick lk-home" + (selectedHome === h.smartHomeId ? " ov-pick--active" : "")}
                    onClick={() => setSelectedHome(h.smartHomeId)}
                    disabled={!pending || showCreate}
                  >
                    <span>
                      <b>{h.smartHomeId}</b>
                      <small>
                        {[h.addressLine1, h.city].filter(Boolean).join(", ") || " "}
                        {h.isDemo ? " · demo" : ""}
                      </small>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedHome === ""}
                  className={"ov-pick lk-home lk-home--none" + (selectedHome === "" ? " ov-pick--active" : "")}
                  onClick={() => setSelectedHome("")}
                  disabled={!pending || showCreate}
                >
                  <span>
                    <b>{T("link.noHome", "No home yet")}</b>
                    <small>{T("link.linkLater", "register only, link later")}</small>
                  </span>
                </button>
              </div>
              {loadingHomes && <p className="lk-step-hint">{T("link.loadingHomes", "Loading your homes…")}</p>}

              {pending && (
                <button
                  type="button"
                  className="ov-btn ov-btn--ghost"
                  onClick={() => setShowCreate((v) => !v)}
                >
                  {showCreate ? T("link.cancelCreate", "Cancel") : T("link.createHome", "+ New home")}
                </button>
              )}

              {pending && showCreate && (
                <form onSubmit={handleCreateHome}>
                  <div className="lk-create" style={{ marginTop: "0.75rem" }}>
                    {[
                      ["country", "Country (2 letters)", "FR"],
                      ["postalCode", "Postal code", "31000"],
                      ["streetCode", "Street (3 letters)", "MAR"],
                      ["houseNumber", "House number", "12"],
                      ["suffix", "Suffix", "01"],
                      ["city", "City", "Toulouse"],
                      ["addressLine1", "Address", "12 rue Martin"],
                    ].map(([field, label, ph]) => (
                      <label key={field}>
                        {T(`link.create.${field}`, label)}
                        <input
                          className="ov-input"
                          type="text"
                          value={createForm[field]}
                          onChange={handleCreateChange(field)}
                          placeholder={ph}
                          required={field !== "addressLine1"}
                        />
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="ov-btn ov-btn--ghost" disabled={creating}>
                    {creating ? T("link.creating", "Creating…") : T("link.doCreate", "Create home")}
                  </button>
                </form>
              )}
              </>
              )}

              {message && <p className="ov-msg">{message}</p>}
              {error && device && <p className="ov-err">{error}</p>}

              <div className="lk-actions" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="ov-btn ov-btn--primary"
                  onClick={handleApprove}
                  disabled={!pending || submitting || showCreate}
                >
                  {submitting
                    ? T("link.approving", "Approving…")
                    : isPro
                    ? T("link.approvePro", "Approve: works for all your homes")
                    : chosen
                    ? T("link.approveTo", "Approve and link to {{id}}", { id: chosen.smartHomeId })
                    : T("link.approveRegister", "Approve (register only)")}
                </button>
                <button
                  type="button"
                  className="ov-btn ov-btn--danger"
                  onClick={handleDeny}
                  disabled={!pending || submitting}
                >
                  {T("link.deny", "Deny")}
                </button>
              </div>
            </section>
          </div>
        )}

        <p className="lk-note">
          {T(
            "link.note",
            "An edge that is linked can be unlinked on the edge itself (Connections → unlink); the cloud keeps its data."
          )}
        </p>
      </div>
    </OverviewShell>
  );
};

export default LinkPage;

// Required for gatsby-plugin-react-i18next
export const query = graphql`
  query LinkPageQuery($language: String!) {
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
