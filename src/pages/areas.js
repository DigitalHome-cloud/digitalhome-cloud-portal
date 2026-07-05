import * as React from "react";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

// Areas — geographic areas keyed by {country}-{postalCode} (e.g. "DE-39576").
// Weather + air-quality data (in the Delta Lake) are keyed by AREA, not by
// SmartHome; a home belongs to the area of its country+postalCode. Admins manage
// areas here (add lat/lon so the weather pipeline can fetch); everyone can read.
// Inline GraphQL so it's independent of codegen.

const client = generateClient();

const LIST_AREAS = /* GraphQL */ `
  query ListAreas {
    listAreas {
      items {
        areaId
        country
        postalCode
        name
        latitude
        longitude
        timezone
        lastIngestedAt
      }
    }
  }
`;

const LIST_HOMES = /* GraphQL */ `
  query ListHomes {
    listDigitalHomes {
      items {
        smartHomeId
        country
        postalCode
      }
    }
  }
`;

const CREATE_AREA = /* GraphQL */ `
  mutation CreateArea($input: CreateAreaInput!) {
    createArea(input: $input) {
      areaId
    }
  }
`;

const UPDATE_AREA = /* GraphQL */ `
  mutation UpdateArea($input: UpdateAreaInput!) {
    updateArea(input: $input) {
      areaId
    }
  }
`;

const EMPTY = { country: "", postalCode: "", name: "" };

const AreasPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, hasGroup } = useAuth();
  const isAdmin = hasGroup && hasGroup("dhc-admins");

  const [areas, setAreas] = React.useState([]);
  const [homeCounts, setHomeCounts] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [form, setForm] = React.useState(null); // null = closed; {} = add; {...} = edit
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ar, hm] = await Promise.all([
        client.graphql({ query: LIST_AREAS, authMode: "userPool" }),
        client.graphql({ query: LIST_HOMES, authMode: "userPool" }),
      ]);
      const items = (ar?.data?.listAreas?.items || []).sort((a, b) =>
        a.areaId.localeCompare(b.areaId)
      );
      setAreas(items);
      const counts = {};
      for (const h of hm?.data?.listDigitalHomes?.items || []) {
        const key = `${h.country}-${h.postalCode}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      setHomeCounts(counts);
    } catch (err) {
      console.error("listAreas failed", err);
      setError(
        t("areas.loadFailed", { defaultValue: "Could not load areas." })
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const openAdd = () => setForm({ ...EMPTY, _mode: "add" });
  const openEdit = (a) =>
    setForm({
      _mode: "edit",
      country: a.country,
      postalCode: a.postalCode,
      name: a.name,
    });

  // Postal code -> coordinates (Zippopotam handles rural postal areas), then
  // coordinates -> IANA timezone (Open-Meteo). Both are keyless and CORS-enabled,
  // so the lookup runs client-side — the user only enters country, ZIP, city.
  const geocode = async (country, postalCode) => {
    const zp = await fetch(
      `https://api.zippopotam.us/${country.toLowerCase()}/${postalCode}`
    );
    if (!zp.ok) throw new Error("postal");
    const place = (await zp.json()).places?.[0];
    if (!place) throw new Error("postal");
    const latitude = parseFloat(place.latitude);
    const longitude = parseFloat(place.longitude);
    let timezone = null;
    try {
      const tz = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=1`
      );
      timezone = (await tz.json())?.timezone || null;
    } catch (e) {
      /* timezone is optional */
    }
    return { latitude, longitude, timezone };
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    const country = form.country.trim().toUpperCase();
    const postalCode = form.postalCode.trim();
    const areaId = `${country}-${postalCode}`;
    try {
      const geo = await geocode(country, postalCode);
      const input = {
        areaId,
        country,
        postalCode,
        name: form.name.trim(),
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
      };
      await client.graphql({
        query: form._mode === "add" ? CREATE_AREA : UPDATE_AREA,
        variables: { input },
        authMode: "userPool",
      });
      setMessage(
        t("areas.saved", {
          defaultValue: "Area {{id}} saved ({{lat}}, {{lon}}).",
          id: areaId,
          lat: geo.latitude.toFixed(4),
          lon: geo.longitude.toFixed(4),
        })
      );
      setForm(null);
      await load();
    } catch (err) {
      console.error("save area failed", err);
      setError(
        err?.message === "postal"
          ? t("areas.geoFailed", {
              defaultValue:
                "Couldn't find that postal code — check the country and ZIP.",
            })
          : t("areas.saveFailed", {
              defaultValue:
                "Could not save the area. Only admins can add or edit areas.",
            })
      );
    } finally {
      setBusy(false);
    }
  };

  const fld = (k, ph, opts = {}) => (
    <input
      className="dhc-form-input"
      style={{
        maxWidth: opts.w || 160,
        display: "inline-block",
        marginRight: "0.4rem",
      }}
      placeholder={ph}
      value={form[k]}
      disabled={opts.disabled}
      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
    />
  );

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">
            {t("areas.title", { defaultValue: "Areas" })}
          </h1>
          <p className="dhc-hero-subtitle">
            {t("areas.subtitle", {
              defaultValue:
                "Geographic areas ({country}-{postalCode}). Weather and air-quality data are collected per area; each SmartHome belongs to its area.",
            })}
          </p>
          {isAdmin && !form && (
            <p>
              <button
                type="button"
                className="dhc-button-base dhc-button-primary"
                onClick={openAdd}
              >
                {t("areas.add", { defaultValue: "+ Add area" })}
              </button>
            </p>
          )}
        </section>

        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.9rem",
            marginBottom: "1.4rem",
          }}
        >
          <div
            style={{
              flex: "1 1 320px",
              padding: "0.9rem 1.1rem",
              border: "1px solid #2b3346",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem" }}>
              {t("areas.cat.weather", { defaultValue: "Weather" })}{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  fontWeight: 400,
                }}
              >
                {t("areas.cat.weatherMeta", {
                  defaultValue: "hourly · 2000–present",
                })}
              </span>
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#c3cbd9", margin: 0 }}>
              {t("areas.cat.weatherBody", {
                defaultValue:
                  "For solar & wind siting: temperature, humidity & dew point; wind at 10 m and 100 m (turbine hub height) + gusts; solar irradiance (GHI, DNI, diffuse) with computed sun elevation/azimuth; precipitation (rain/snow); pressure; cloud cover; evapotranspiration.",
              })}
            </p>
          </div>
          <div
            style={{
              flex: "1 1 320px",
              padding: "0.9rem 1.1rem",
              border: "1px solid #2b3346",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem" }}>
              {t("areas.cat.air", { defaultValue: "Air quality" })}{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  fontWeight: 400,
                }}
              >
                {t("areas.cat.airMeta", {
                  defaultValue: "hourly · 2013–present",
                })}
              </span>
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#c3cbd9", margin: 0 }}>
              {t("areas.cat.airBody", {
                defaultValue:
                  "PM10, PM2.5, NO₂, O₃, SO₂, CO, dust, aerosol optical depth, UV index.",
              })}
            </p>
          </div>
        </section>

        {error && <p className="dhc-error">{error}</p>}
        {message && <p className="dhc-message">{message}</p>}

        {form && (
          <section
            style={{
              marginBottom: "1.2rem",
              padding: "1rem 1.2rem",
              border: "1px solid #2b3346",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {form._mode === "add"
                ? t("areas.add", { defaultValue: "+ Add area" })
                : t("areas.edit", { defaultValue: "Edit area" })}
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {fld("country", "DE", { w: 70, disabled: form._mode === "edit" })}
              {fld("postalCode", "39576", {
                w: 100,
                disabled: form._mode === "edit",
              })}
              {fld("name", t("areas.cityPh", { defaultValue: "City" }), {
                w: 240,
              })}
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#9ca3af",
                margin: "0.5rem 0",
              }}
            >
              areaId ={" "}
              <code>
                {(form.country || "??").toUpperCase()}-
                {form.postalCode || "?????"}
              </code>{" "}
              —{" "}
              {t("areas.lookupNote", {
                defaultValue:
                  "coordinates & timezone are looked up automatically from the postal code.",
              })}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="dhc-button-base dhc-button-primary"
                disabled={
                  busy || !form.country || !form.postalCode || !form.name
                }
                onClick={save}
              >
                {busy
                  ? t("areas.saving", { defaultValue: "Looking up…" })
                  : t("areas.save", { defaultValue: "Save" })}
              </button>
              <button
                type="button"
                className="dhc-button-base dhc-button-secondary"
                onClick={() => setForm(null)}
              >
                {t("areas.cancel", { defaultValue: "Cancel" })}
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <p>{t("areas.loading", { defaultValue: "Loading…" })}</p>
        ) : areas.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>
            {t("areas.empty", { defaultValue: "No areas yet." })}
          </p>
        ) : (
          <table className="dhc-manager-table">
            <thead>
              <tr>
                <th>{t("areas.col.area", { defaultValue: "Area" })}</th>
                <th>
                  {t("areas.col.coords", { defaultValue: "Coordinates" })}
                </th>
                <th>{t("areas.col.homes", { defaultValue: "SmartHomes" })}</th>
                <th>
                  {t("areas.col.weather", {
                    defaultValue: "Last weather ingest",
                  })}
                </th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.areaId}>
                  <td>
                    <strong>{a.areaId}</strong>
                    <br />
                    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      {a.name}
                      {a.timezone ? ` · ${a.timezone}` : ""}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                  </td>
                  <td>
                    <span className="dhc-nav-pill">
                      {homeCounts[a.areaId] || 0}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {a.lastIngestedAt ? (
                      new Date(a.lastIngestedAt).toLocaleDateString()
                    ) : (
                      <span style={{ color: "#f59e0b" }}>
                        {t("areas.never", { defaultValue: "never" })}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <button
                        type="button"
                        className="dhc-button-base dhc-button-secondary"
                        onClick={() => openEdit(a)}
                      >
                        {t("areas.edit", { defaultValue: "Edit" })}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </Layout>
  );
};

export default AreasPage;

export const query = graphql`
  query AreasPageQuery($language: String!) {
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
