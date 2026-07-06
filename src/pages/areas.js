import * as React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import { useAuth } from "../context/AuthContext";
import { generateClient } from "aws-amplify/api";

import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";

// Areas — geographic areas keyed by {country}-{postalCode} (e.g. "DE-39576").
// The "manage" side of Area data: admins add/edit areas (lat/lon so the weather
// pipeline can fetch); a "View area data" button toggles back to /operator.

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
  const [form, setForm] = React.useState(null); // null=closed; {} = add; {...} = edit
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

  // Postal code -> coordinates (Zippopotam), then coordinates -> IANA timezone
  // (Open-Meteo). Both keyless and CORS-enabled, so the lookup runs client-side.
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
      className="ov-input"
      style={{ maxWidth: opts.w || 160, marginRight: "0.4rem" }}
      placeholder={ph}
      value={form[k]}
      disabled={opts.disabled}
      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
    />
  );

  return (
    <OverviewShell active="areadata" title="Area data">
      <div className="ov-page">
        <div className="ov-page-head ov-head-row">
          <div>
            <h1 className="ov-page-title">
              {t("areas.title", { defaultValue: "Areas" })}
            </h1>
            <p className="ov-page-sub">
              {t("areas.subtitle", {
                defaultValue:
                  "Geographic areas ({country}-{postalCode}). Weather and air-quality data are collected per area; each SmartHome belongs to its area.",
              })}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="ov-btn ov-btn--ghost"
              onClick={() => navigate("/operator")}
            >
              ← {t("areas.viewData", { defaultValue: "View area data" })}
            </button>
            {isAdmin && !form && (
              <button
                type="button"
                className="ov-btn ov-btn--primary"
                onClick={openAdd}
              >
                {t("areas.add", { defaultValue: "+ Add area" })}
              </button>
            )}
          </div>
        </div>

        <div className="ov-cards">
          <div className="ov-info-card">
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>
              {t("areas.cat.weather", { defaultValue: "Weather" })}{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#8a958f",
                  fontWeight: 400,
                }}
              >
                {t("areas.cat.weatherMeta", {
                  defaultValue: "hourly · 2000–present",
                })}
              </span>
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#b9c4be", margin: 0 }}>
              {t("areas.cat.weatherBody", {
                defaultValue:
                  "For solar & wind siting: temperature, humidity & dew point; wind at 10 m and 100 m (turbine hub height) + gusts; solar irradiance (GHI, DNI, diffuse) with computed sun elevation/azimuth; precipitation (rain/snow); pressure; cloud cover; evapotranspiration.",
              })}
            </p>
          </div>
          <div className="ov-info-card">
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem" }}>
              {t("areas.cat.air", { defaultValue: "Air quality" })}{" "}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#8a958f",
                  fontWeight: 400,
                }}
              >
                {t("areas.cat.airMeta", {
                  defaultValue: "hourly · 2013–present",
                })}
              </span>
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#b9c4be", margin: 0 }}>
              {t("areas.cat.airBody", {
                defaultValue:
                  "PM10, PM2.5, NO₂, O₃, SO₂, CO, dust, aerosol optical depth, UV index.",
              })}
            </p>
          </div>
        </div>

        {error && <p className="ov-err">{error}</p>}
        {message && <p className="ov-msg">{message}</p>}

        {form && (
          <div
            className="ov-info-card"
            style={{ marginBottom: "1.2rem", flex: "unset" }}
          >
            <h3 style={{ marginTop: 0, fontSize: "0.95rem" }}>
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
                color: "#8a958f",
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
                className="ov-btn ov-btn--primary"
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
                className="ov-btn ov-btn--ghost"
                onClick={() => setForm(null)}
              >
                {t("areas.cancel", { defaultValue: "Cancel" })}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: "#8a958f" }}>
            {t("areas.loading", { defaultValue: "Loading…" })}
          </p>
        ) : areas.length === 0 ? (
          <p style={{ color: "#8a958f" }}>
            {t("areas.empty", { defaultValue: "No areas yet." })}
          </p>
        ) : (
          <div className="ov-tablewrap">
            <table className="ov-table">
              <thead>
                <tr>
                  <th>{t("areas.col.area", { defaultValue: "Area" })}</th>
                  <th>
                    {t("areas.col.coords", { defaultValue: "Coordinates" })}
                  </th>
                  <th>
                    {t("areas.col.homes", { defaultValue: "SmartHomes" })}
                  </th>
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
                      <span style={{ fontSize: "0.8rem", color: "#8a958f" }}>
                        {a.name}
                        {a.timezone ? ` · ${a.timezone}` : ""}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "0.8rem",
                      }}
                    >
                      {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                    </td>
                    <td>
                      <span className="ov-pill">
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
                          className="ov-btn ov-btn--ghost"
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
          </div>
        )}
      </div>
    </OverviewShell>
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
