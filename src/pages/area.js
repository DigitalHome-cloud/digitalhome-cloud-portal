import * as React from "react";
import Layout from "../components/Layout";
import { graphql, navigate, Link } from "gatsby";
import { useAuth } from "../context/AuthContext";
import EChart from "../components/charts/EChart";
import * as opt from "../components/charts/options";
import { fetchAreaBlock } from "../utils/weatherData";

// Per-area renewables dashboard. Reads ?id=DE-39576, fetches the pre-aggregated
// gold JSON from S3, and renders a scorecard + four analytics tabs.

const card = {
  border: "1px solid #2b3346",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.02)",
  padding: "0.9rem 1rem",
};

const Stat = ({ label, value, unit, hint }) => (
  <div style={{ ...card, minWidth: 130, flex: "1 1 130px" }}>
    <div style={{ fontSize: "0.72rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label}
    </div>
    <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.15rem" }}>
      {value ?? "—"}
      {unit && <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 400 }}> {unit}</span>}
    </div>
    {hint && <div style={{ fontSize: "0.7rem", color: "#6c7689" }}>{hint}</div>}
  </div>
);

const ChartCard = ({ title, children }) => (
  <div style={{ ...card, flex: "1 1 460px", minWidth: 300 }}>
    <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.9rem", color: "#c3cbd9" }}>{title}</h4>
    {children}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>{children}</div>
);

const TABS = [
  ["solar", "Solar"],
  ["wind", "Wind"],
  ["climate", "Climate"],
  ["air", "Air quality"],
];

const AreaPage = ({ location }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const areaId = new URLSearchParams(location?.search || "").get("id") || "";

  const [tab, setTab] = React.useState("solar");
  const [data, setData] = React.useState({});
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated || !areaId) return;
    const kinds = { solar: "solar", wind: "wind", climate: "climate", air: "air_quality" };
    Promise.all(
      Object.entries(kinds).map(([k, file]) =>
        fetchAreaBlock(areaId, file).then((d) => [k, d]).catch(() => [k, null])
      )
    )
      .then((pairs) => setData(Object.fromEntries(pairs)))
      .catch((e) => setError(String(e)));
    fetchAreaBlock(areaId, "summary").then(setSummary).catch(() => {});
  }, [isAuthenticated, areaId]);

  const s = data.solar, w = data.wind, cl = data.climate, aq = data.air;

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero" style={{ paddingBottom: "0.5rem" }}>
          <p style={{ margin: 0 }}>
            <Link to="/operator" className="dhc-nav-link">← Areas</Link>
          </p>
          <h1 className="dhc-hero-title">{summary?.name || areaId}</h1>
          <p className="dhc-hero-subtitle">
            {areaId}
            {summary && ` · ${summary.latitude}, ${summary.longitude} · weather ${summary.span_weather?.[0]}–${summary.span_weather?.[1]}`}
          </p>
        </section>

        {error && <p className="dhc-error">{error}</p>}
        {!areaId && <p className="dhc-error">No area selected — open a dashboard from the Areas list.</p>}

        {summary && (
          <Row>
            <Stat label="PV yield" value={summary.pv_yield_kwh_kwp} unit="kWh/kWp" hint={`optimal tilt ${summary.optimal_tilt_deg}°`} />
            <Stat label="Annual GHI" value={summary.annual_ghi_kwh_m2} unit="kWh/m²" />
            <Stat label="Wind CF @100m" value={summary.wind_cf_pct} unit="%" hint={`${summary.mean_wind_100m_ms} m/s mean`} />
            <Stat label="Mean temp" value={summary.mean_temp_c} unit="°C" />
            <Stat label="Heating / cooling" value={`${summary.hdd} / ${summary.cdd}`} unit="dd/yr" />
            <Stat label="Air quality" value={summary.aqi_band} hint={`PM2.5 ${summary.mean_pm25 ?? "—"} µg/m³`} />
          </Row>
        )}

        <nav style={{ display: "flex", gap: "0.4rem", margin: "1.4rem 0 1rem", flexWrap: "wrap" }}>
          {TABS.map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`dhc-button-base ${tab === k ? "dhc-button-primary" : "dhc-button-secondary"}`}
            >
              {lbl}
            </button>
          ))}
        </nav>

        {tab === "solar" && s && (
          <Row>
            <ChartCard title="Monthly irradiance (kWh/m²/day)"><EChart option={opt.monthlyIrradiance(s)} /></ChartCard>
            <ChartCard title="Sun path (azimuth × elevation)"><EChart option={opt.sunPath(s)} /></ChartCard>
            <ChartCard title="Irradiance by hour × month (W/m²)"><EChart option={opt.irradianceHeatmap(s)} height={340} /></ChartCard>
            <ChartCard title={`Tilt → annual yield (optimum ${s.optimal_tilt}°)`}><EChart option={opt.tiltYield(s)} /></ChartCard>
          </Row>
        )}
        {tab === "wind" && w && (
          <Row>
            <ChartCard title="Wind rose @100 m (% of time)"><EChart option={opt.windRose(w)} height={360} /></ChartCard>
            <ChartCard title="Speed distribution + Weibull fit"><EChart option={opt.weibullHist(w)} /></ChartCard>
            <ChartCard title="Monthly mean wind @100 m"><EChart option={opt.monthlyWind(w)} /></ChartCard>
            <ChartCard title="Turbine capacity factor"><EChart option={opt.gauge(w.capacity_factor_pct, "capacity factor")} height={260} /></ChartCard>
          </Row>
        )}
        {tab === "climate" && cl && (
          <Row>
            <ChartCard title="Monthly temperature (min / mean / max)"><EChart option={opt.tempBand(cl)} /></ChartCard>
            <ChartCard title="Degree-days (heating / cooling)"><EChart option={opt.degreeDays(cl)} /></ChartCard>
            <ChartCard title="Temperature duration curve"><EChart option={opt.durationCurve(cl)} /></ChartCard>
          </Row>
        )}
        {tab === "air" && (aq ? (
          <Row>
            <ChartCard title={`Monthly pollutants (µg/m³) · ${aq.span?.[0]}–${aq.span?.[1]}`}><EChart option={opt.pollutants(aq)} /></ChartCard>
            <ChartCard title="Days per year over WHO limits"><EChart option={opt.daysOverLimit(aq)} /></ChartCard>
          </Row>
        ) : (
          <p style={{ color: "#9ca3af" }}>No air-quality data for this area.</p>
        ))}
      </main>
    </Layout>
  );
};

export default AreaPage;

export const query = graphql`
  query AreaDashboardQuery($language: String!) {
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
