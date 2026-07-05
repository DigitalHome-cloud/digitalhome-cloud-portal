import * as React from "react";
import Layout from "../components/Layout";
import { graphql, navigate, Link } from "gatsby";
import { useAuth } from "../context/AuthContext";
import { fetchIndex } from "../utils/weatherData";

// Operator landing: area cards (scorecard metrics) + a cross-area comparison,
// each linking to its per-area dashboard (/area?id=…). Data from gold index.json.

const card = {
  border: "1px solid #2b3346",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.02)",
  padding: "1rem 1.1rem",
};

const Metric = ({ label, value, unit }) => (
  <div>
    <div style={{ fontSize: "0.68rem", color: "#9ca3af", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
      {value ?? "—"}
      {unit && <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 400 }}> {unit}</span>}
    </div>
  </div>
);

// best value per column is highlighted in the compare table
const BEST = { pv_yield_kwh_kwp: "max", annual_ghi_kwh_m2: "max", wind_cf_pct: "max", mean_pm25: "min" };

const OperatorPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [areas, setAreas] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    fetchIndex().then(setAreas).catch((e) => setError(String(e)));
  }, [isAuthenticated]);

  const bestOf = (key) => {
    if (!areas) return null;
    const vals = areas.map((a) => a[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return BEST[key] === "min" ? Math.min(...vals) : Math.max(...vals);
  };

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero">
          <h1 className="dhc-hero-title">Operator · Area analytics</h1>
          <p className="dhc-hero-subtitle">
            Renewable-siting and climate analytics per area, from 20+ years of hourly
            weather. Open an area for solar, wind, climate, and air-quality detail.
          </p>
        </section>

        {error && <p className="dhc-error">{error}</p>}
        {!areas && !error && <p>Loading…</p>}

        {areas && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.6rem" }}>
              {areas.map((a) => (
                <Link
                  key={a.areaId}
                  to={`/area?id=${encodeURIComponent(a.areaId)}`}
                  style={{ ...card, flex: "1 1 300px", minWidth: 280, textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontSize: "1.05rem" }}>{a.name}</strong>
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6c9dff" }}>{a.areaId}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginTop: "0.8rem" }}>
                    <Metric label="PV yield" value={a.pv_yield_kwh_kwp} unit="kWh/kWp" />
                    <Metric label="Wind CF" value={a.wind_cf_pct} unit="%" />
                    <Metric label="Mean temp" value={a.mean_temp_c} unit="°C" />
                    <Metric label="Air" value={a.aqi_band} />
                  </div>
                  <div style={{ marginTop: "0.8rem", fontSize: "0.8rem", color: "#6c9dff" }}>Open dashboard →</div>
                </Link>
              ))}
            </div>

            <h3 style={{ margin: "0 0 0.6rem" }}>Compare</h3>
            <div className="tablewrap" style={{ overflowX: "auto", border: "1px solid #2b3346", borderRadius: "10px" }}>
              <table className="dhc-manager-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>PV yield (kWh/kWp)</th>
                    <th>GHI (kWh/m²)</th>
                    <th>Wind CF (%)</th>
                    <th>Mean temp (°C)</th>
                    <th>HDD</th>
                    <th>CDD</th>
                    <th>PM2.5</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a) => {
                    const cell = (key, v) =>
                      v === bestOf(key)
                        ? <strong style={{ color: "#48c996" }}>{v}</strong>
                        : v;
                    return (
                      <tr key={a.areaId}>
                        <td><Link to={`/area?id=${encodeURIComponent(a.areaId)}`} style={{ color: "#6c9dff" }}>{a.name}</Link></td>
                        <td>{cell("pv_yield_kwh_kwp", a.pv_yield_kwh_kwp)}</td>
                        <td>{cell("annual_ghi_kwh_m2", a.annual_ghi_kwh_m2)}</td>
                        <td>{cell("wind_cf_pct", a.wind_cf_pct)}</td>
                        <td>{a.mean_temp_c}</td>
                        <td>{a.hdd}</td>
                        <td>{a.cdd}</td>
                        <td>{cell("mean_pm25", a.mean_pm25)} <span style={{ color: "#6c7689", fontSize: "0.75rem" }}>{a.aqi_band}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </Layout>
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
