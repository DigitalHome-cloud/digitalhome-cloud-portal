import * as React from "react";
import { graphql, navigate, Link } from "gatsby";
import OverviewShell from "../components/OverviewShell";
import { useAuth } from "../context/AuthContext";
import { fetchIndex } from "../utils/weatherData";

import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "../styles/overview.css";

// Area data landing (inside the Overview shell): area cards + a cross-area
// comparison, each linking to its per-area dashboard (/area?id=…). A "Manage
// areas" button toggles to /areas. Data from gold index.json.

const Metric = ({ label, value, unit }) => (
  <div>
    <div className="ov-metric-l">{label}</div>
    <div className="ov-metric-v">
      {value ?? "—"}
      {unit && <span> {unit}</span>}
    </div>
  </div>
);

// best value per column is highlighted in the compare table
const BEST = {
  pv_yield_kwh_kwp: "max",
  annual_ghi_kwh_m2: "max",
  wind_cf_pct: "max",
  mean_pm25: "min",
};

const OperatorPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [areas, setAreas] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetchIndex()
      .then(setAreas)
      .catch((e) => setError(String(e)));
  }, [isAuthenticated]);

  const bestOf = (key) => {
    if (!areas) return null;
    const vals = areas.map((a) => a[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return BEST[key] === "min" ? Math.min(...vals) : Math.max(...vals);
  };

  return (
    <OverviewShell active="areadata" title="Area data">
      <div className="ov-page">
        <div className="ov-page-head ov-head-row">
          <div>
            <h1 className="ov-page-title">Area data</h1>
            <p className="ov-page-sub">
              Renewable-siting and climate analytics per area, from 20+ years of
              hourly weather. Open an area for solar, wind, climate, and
              air-quality detail.
            </p>
          </div>
          <button
            type="button"
            className="ov-btn ov-btn--ghost"
            onClick={() => navigate("/areas")}
          >
            Manage areas →
          </button>
        </div>

        {error && <p className="ov-err">{error}</p>}
        {!areas && !error && <p style={{ color: "#8a958f" }}>Loading…</p>}

        {areas && (
          <>
            <div className="ov-cards">
              {areas.map((a) => (
                <Link
                  key={a.areaId}
                  to={`/area?id=${encodeURIComponent(a.areaId)}`}
                  className="ov-linkcard"
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <strong style={{ fontSize: "1.05rem" }}>{a.name}</strong>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "0.78rem",
                        color: "var(--ov-green)",
                      }}
                    >
                      {a.areaId}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.7rem",
                      marginTop: "0.8rem",
                    }}
                  >
                    <Metric
                      label="PV yield"
                      value={a.pv_yield_kwh_kwp}
                      unit="kWh/kWp"
                    />
                    <Metric label="Wind CF" value={a.wind_cf_pct} unit="%" />
                    <Metric label="Mean temp" value={a.mean_temp_c} unit="°C" />
                    <Metric label="Air" value={a.aqi_band} />
                  </div>
                  <div
                    style={{
                      marginTop: "0.8rem",
                      fontSize: "0.8rem",
                      color: "var(--ov-green)",
                    }}
                  >
                    Open dashboard →
                  </div>
                </Link>
              ))}
            </div>

            <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem" }}>
              Compare
            </h3>
            <div className="ov-tablewrap">
              <table className="ov-table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>PV yield (kWh/kWp)</th>
                    <th>GHI (kWh/m²)</th>
                    <th>Wind CF (%)</th>
                    <th>Mean temp (°C)</th>
                    <th>Rain (mm)</th>
                    <th>HDD</th>
                    <th>CDD</th>
                    <th>PM2.5</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a) => {
                    const cell = (key, v) =>
                      v === bestOf(key) ? (
                        <strong className="ov-best">{v}</strong>
                      ) : (
                        v
                      );
                    return (
                      <tr key={a.areaId}>
                        <td>
                          <Link
                            to={`/area?id=${encodeURIComponent(a.areaId)}`}
                            className="ov-accent"
                          >
                            {a.name}
                          </Link>
                        </td>
                        <td>{cell("pv_yield_kwh_kwp", a.pv_yield_kwh_kwp)}</td>
                        <td>
                          {cell("annual_ghi_kwh_m2", a.annual_ghi_kwh_m2)}
                        </td>
                        <td>{cell("wind_cf_pct", a.wind_cf_pct)}</td>
                        <td>{a.mean_temp_c}</td>
                        <td>{a.annual_rain_mm}</td>
                        <td>{a.hdd}</td>
                        <td>{a.cdd}</td>
                        <td>
                          {cell("mean_pm25", a.mean_pm25)}{" "}
                          <span
                            style={{ color: "#6c7689", fontSize: "0.75rem" }}
                          >
                            {a.aqi_band}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </OverviewShell>
  );
};

export default OperatorPage;

export const query = graphql`
  query OperatorPageQuery($language: String!) {
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
