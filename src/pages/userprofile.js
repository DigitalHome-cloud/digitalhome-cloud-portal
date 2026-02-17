import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

// These come from `amplify codegen`
import { listUserProfiles } from "../graphql/queries";
import {
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "../graphql/mutations";

const client = generateClient();

const UserProfilePage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useAuth();

  const [profile, setProfile] = React.useState(null);
  const [form, setForm] = React.useState({
    displayName: "",
    email: "",
    locale: "",
    marketingOptIn: false,
  });
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/signin");
    }
  }, [isLoading, isAuthenticated]);

  // Load profile for current user
  React.useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !user) {
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      setError("");
      setMessage("");

      try {
        const username = user.username; // matches identityClaim "cognito:username"
        const result = await client.graphql({
          query: listUserProfiles,
          variables: {
            filter: { owner: { eq: username } },
            limit: 1,
          },
          authMode: "userPool",
        });

        const items = result?.data?.listUserProfiles?.items || [];
        const existing = items[0] || null;
        setProfile(existing);

        setForm({
          displayName: existing?.displayName || "",
          email: existing?.email || "",
          locale: existing?.locale || "",
          marketingOptIn: !!existing?.marketingOptIn,
        });
      } catch (err) {
        console.error("Error loading profile", err);
        setError("Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    if (isAuthenticated && user) {
      load();
    }
  }, [isAuthenticated, user]);

  const handleChange = (field) => (event) => {
    const value =
      field === "marketingOptIn" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      let result;
      if (profile?.id) {
        // Update existing
        result = await client.graphql({
          query: updateUserProfile,
          variables: {
            input: {
              id: profile.id,
              displayName: form.displayName || null,
              email: form.email || null,
              locale: form.locale || null,
              marketingOptIn: form.marketingOptIn,
            },
          },
          authMode: "userPool",
        });
      } else {
        // Create new
        result = await client.graphql({
          query: createUserProfile,
          variables: {
            input: {
              // owner gets auto-filled by @auth rule
              displayName: form.displayName || null,
              email: form.email || null,
              locale: form.locale || null,
              marketingOptIn: form.marketingOptIn,
            },
          },
          authMode: "userPool",
        });
      }

      const saved = result.data.updateUserProfile || result.data.createUserProfile;
      setProfile(saved);
      setMessage(t("userprofile.saved", { defaultValue: "Profile saved." }));
    } catch (err) {
      console.error("Error saving profile", err);
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.id) return;
    if (!window.confirm(t("userprofile.confirmDelete", {
      defaultValue: "Delete your profile? This cannot be undone.",
    }))) {
      return;
    }

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
      setForm({
        displayName: "",
        email: "",
        locale: "",
        marketingOptIn: false,
      });
      setMessage(t("userprofile.deleted", { defaultValue: "Profile deleted." }));
    } catch (err) {
      console.error("Error deleting profile", err);
      setError("Failed to delete profile.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckout = () => {
    // Placeholder: hook this into your payment / plan selection flow later.
    alert("Checkout flow not implemented yet.");
  };

  const title = t("userprofile.title", { defaultValue: "Your profile" });

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-section dhc-section-profile">
          <h1 className="dhc-page-title">{title}</h1>
          <p className="dhc-page-subtitle">
            {t("userprofile.subtitle", {
              defaultValue:
                "Review and update your profile information. You can also delete your profile or start a checkout.",
            })}
          </p>

          {loadingProfile || isLoading ? (
            <p>{t("userprofile.loading", { defaultValue: "Loading profile..." })}</p>
          ) : (
            <form className="dhc-profile-form" onSubmit={handleSave}>
              {error && <p className="dhc-error">{error}</p>}
              {message && <p className="dhc-message">{message}</p>}

              <div className="dhc-form-row">
                <label>
                  {t("userprofile.displayName", { defaultValue: "Display name" })}
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={handleChange("displayName")}
                  />
                </label>
              </div>

              <div className="dhc-form-row">
                <label>
                  {t("userprofile.email", { defaultValue: "Email" })}
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </label>
              </div>

              <div className="dhc-form-row">
                <label>
                  {t("userprofile.locale", { defaultValue: "Preferred language / locale" })}
                  <input
                    type="text"
                    value={form.locale}
                    onChange={handleChange("locale")}
                    placeholder="en-US, de-DE, fr-FR…"
                  />
                </label>
              </div>

              <div className="dhc-form-row dhc-form-row--checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={form.marketingOptIn}
                    onChange={handleChange("marketingOptIn")}
                  />
                  {t("userprofile.marketingOptIn", {
                    defaultValue: "I’d like to receive updates and news.",
                  })}
                </label>
              </div>

              <div className="dhc-profile-actions">
                <button
                  type="submit"
                  className="dhc-btn dhc-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? t("userprofile.saving", { defaultValue: "Saving…" })
                    : t("userprofile.save", { defaultValue: "Save profile" })}
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="dhc-btn dhc-button-secondary"
                >
                  {t("userprofile.checkout", { defaultValue: "Checkout" })}
                </button>

                {profile?.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="dhc-btn dhc-button-danger"
                    disabled={deleting}
                  >
                    {deleting
                      ? t("userprofile.deleting", { defaultValue: "Deleting…" })
                      : t("userprofile.delete", { defaultValue: "Delete profile" })}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </Layout>
  );
};

export default UserProfilePage;

// 👇 Required for gatsby-plugin-react-i18next
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
