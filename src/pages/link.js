import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

// Edge ↔ Cloud pairing approval page (DH-SPEC-100 / edge-cloud-api.md §2).
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

const DESCRIBE_DEVICE_CODE = /* GraphQL */ `
  query DescribeDeviceCode($user_code: String!) {
    describeDeviceCode(user_code: $user_code) {
      status
      hostname
      lan_ip
      dhe_version
      machine_id
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
        const res = await client.graphql({
          query: DESCRIBE_DEVICE_CODE,
          variables: { user_code: code },
          authMode: "userPool",
        });
        setDevice(res?.data?.describeDeviceCode || null);
      } catch (err) {
        console.error("describeDeviceCode failed", err);
        setDevice(null);
        setError(
          t("link.notFound", {
            defaultValue:
              "No pending device found for that code. Check the code on your box's screen — it may have expired (they last 10 minutes).",
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
          home_id: selectedHome || null,
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
        t("link.denyFailed", { defaultValue: "Could not deny the device." })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title = t("link.title", { defaultValue: "Link an edge box" });

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-section">
          <h1 className="dhc-page-title">{title}</h1>
          <p className="dhc-page-subtitle">
            {t("link.subtitle", {
              defaultValue:
                "Approve a DigitalHome edge box shown on your device's screen and link it to one of your homes.",
            })}
          </p>

          {(isLoading || !isAuthenticated) && (
            <p>{t("link.loading", { defaultValue: "Loading…" })}</p>
          )}

          {isAuthenticated && (
            <>
              {error && <p className="dhc-error">{error}</p>}
              {message && <p className="dhc-message">{message}</p>}

              {outcome === "approved" && (
                <p className="dhc-message">
                  {t("link.approved", {
                    defaultValue:
                      "Approved. Your box will finish linking within a few seconds — its screen will switch to the linked state.",
                  })}
                </p>
              )}
              {outcome === "denied" && (
                <p className="dhc-message">
                  {t("link.denied", {
                    defaultValue:
                      "Device denied. The box will show a denied message and must be restarted to try again.",
                  })}
                </p>
              )}

              {!outcome && (
                <form className="dhc-profile-form" onSubmit={handleLookup}>
                  {/* Pairing code */}
                  <div className="dhc-form-row">
                    <label>
                      {t("link.userCode", { defaultValue: "Pairing code" })}
                      <input
                        type="text"
                        value={userCode}
                        onChange={(e) =>
                          setUserCode(e.target.value.toUpperCase())
                        }
                        placeholder="ABCD-1234"
                        autoComplete="off"
                      />
                    </label>
                    <button
                      type="submit"
                      className="dhc-button-base dhc-button-secondary"
                      disabled={loadingDevice || !userCode.trim()}
                    >
                      {loadingDevice
                        ? t("link.checking", { defaultValue: "Checking…" })
                        : t("link.check", { defaultValue: "Check code" })}
                    </button>
                  </div>

                  {/* device_info sanity-check card */}
                  {device && (
                    <div className="dhc-form-row">
                      <p>
                        <strong>
                          {t("link.deviceHeading", {
                            defaultValue: "Is this your box?",
                          })}
                        </strong>
                      </p>
                      <ul>
                        <li>
                          {t("link.hostname", { defaultValue: "Hostname" })}:{" "}
                          {device.hostname || "—"}
                        </li>
                        <li>
                          {t("link.lanIp", { defaultValue: "LAN IP" })}:{" "}
                          {device.lan_ip || "—"}
                        </li>
                        <li>
                          {t("link.dheVersion", {
                            defaultValue: "Edge version",
                          })}
                          : {device.dhe_version || "—"}
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Home selection */}
                  {device && device.status === "pending" && (
                    <>
                      <div className="dhc-form-row">
                        <label>
                          {t("link.home", {
                            defaultValue: "Link to home (optional)",
                          })}
                          <select
                            value={selectedHome}
                            onChange={(e) => setSelectedHome(e.target.value)}
                            disabled={loadingHomes || showCreate}
                          >
                            <option value="">
                              {t("link.linkLater", {
                                defaultValue: "— register only, link later —",
                              })}
                            </option>
                            {homes.map((h) => (
                              <option key={h.smartHomeId} value={h.smartHomeId}>
                                {h.smartHomeId}
                                {h.city ? ` — ${h.city}` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="dhc-button-base dhc-button-ghost"
                          onClick={() => setShowCreate((v) => !v)}
                        >
                          {showCreate
                            ? t("link.cancelCreate", { defaultValue: "Cancel" })
                            : t("link.createHome", {
                                defaultValue: "Create a new home",
                              })}
                        </button>
                      </div>

                      {/* Inline create-new home (reuses initiateDigitalHome) */}
                      {showCreate && (
                        <div className="dhc-form-row">
                          {[
                            ["country", "Country (2-letter)", "DE"],
                            ["postalCode", "Postal code", "80331"],
                            ["streetCode", "Street code (3 letters)", "MAR"],
                            ["houseNumber", "House number", "12"],
                            ["suffix", "Suffix", "01"],
                            ["city", "City", "München"],
                            ["addressLine1", "Address line", "Marienplatz 12"],
                          ].map(([field, label, ph]) => (
                            <label key={field}>
                              {t(`link.create.${field}`, {
                                defaultValue: label,
                              })}
                              <input
                                type="text"
                                value={createForm[field]}
                                onChange={handleCreateChange(field)}
                                placeholder={ph}
                              />
                            </label>
                          ))}
                          <button
                            type="button"
                            className="dhc-button-base dhc-button-secondary"
                            onClick={handleCreateHome}
                            disabled={creating}
                          >
                            {creating
                              ? t("link.creating", {
                                  defaultValue: "Creating…",
                                })
                              : t("link.doCreate", {
                                  defaultValue: "Create home",
                                })}
                          </button>
                        </div>
                      )}

                      {/* Approve / Deny */}
                      <div className="dhc-profile-actions">
                        <button
                          type="button"
                          className="dhc-button-base dhc-button-primary"
                          onClick={handleApprove}
                          disabled={submitting}
                        >
                          {submitting
                            ? t("link.approving", {
                                defaultValue: "Approving…",
                              })
                            : selectedHome
                            ? t("link.approve", {
                                defaultValue: "Approve & link",
                              })
                            : t("link.approveRegister", {
                                defaultValue: "Approve (register only)",
                              })}
                        </button>
                        <button
                          type="button"
                          className="dhc-button-base dhc-button-danger"
                          onClick={handleDeny}
                          disabled={submitting}
                        >
                          {t("link.deny", { defaultValue: "Deny" })}
                        </button>
                      </div>
                    </>
                  )}

                  {device && device.status && device.status !== "pending" && (
                    <p className="dhc-message">
                      {t("link.alreadyResolved", {
                        defaultValue: "This code was already {{status}}.",
                        status: device.status,
                      })}
                    </p>
                  )}
                </form>
              )}
            </>
          )}
        </section>
      </main>
    </Layout>
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
