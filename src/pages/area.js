import * as React from "react";
import Layout from "../components/Layout";
import { graphql, navigate, Link } from "gatsby";
import { useAuth } from "../context/AuthContext";
import EChart from "../components/charts/EChart";
import * as opt from "../components/charts/options";
import {
  fetchAreaBlock,
  fetchWater,
  fetchLightning,
} from "../utils/weatherData";

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
    <div
      style={{
        fontSize: "0.72rem",
        color: "#9ca3af",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.15rem" }}>
      {value ?? "—"}
      {unit && (
        <span style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 400 }}>
          {" "}
          {unit}
        </span>
      )}
    </div>
    {hint && <div style={{ fontSize: "0.7rem", color: "#6c7689" }}>{hint}</div>}
  </div>
);

const ChartCard = ({ title, children }) => (
  <div style={{ ...card, flex: "1 1 460px", minWidth: 300 }}>
    <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.9rem", color: "#c3cbd9" }}>
      {title}
    </h4>
    {children}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
    {children}
  </div>
);

const TABS = [
  ["solar", "Solar"],
  ["wind", "Wind"],
  ["climate", "Climate"],
  ["water", "Water"],
  ["air", "Air quality"],
];

const WINDOWS = [
  ["all", "Full history"],
  ["10y", "Last 10 years"],
  ["5y", "Last 5 years"],
  ["3y", "Last 3 years"],
  ["1y", "Last 1 year"],
];

const AreaPage = ({ location }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const areaId = new URLSearchParams(location?.search || "").get("id") || "";

  const [tab, setTab] = React.useState("solar");
  const [win, setWin] = React.useState("all");
  const [data, setData] = React.useState({});
  const [summary, setSummary] = React.useState(null);
  const [water, setWater] = React.useState(undefined); // undefined=loading, null=none
  const [lightning, setLightning] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/signin");
  }, [isLoading, isAuthenticated]);

  // Windowed blocks (reload when the averaging window changes).
  React.useEffect(() => {
    if (!isAuthenticated || !areaId) return;
    setData({});
    const kinds = {
      solar: "solar",
      wind: "wind",
      climate: "climate",
      air: "air_quality",
    };
    Promise.all(
      Object.entries(kinds).map(([k, file]) =>
        fetchAreaBlock(areaId, file, win)
          .then((d) => [k, d])
          .catch(() => [k, null])
      )
    )
      .then((pairs) => setData(Object.fromEntries(pairs)))
      .catch((e) => setError(String(e)));
    fetchAreaBlock(areaId, "summary", win)
      .then(setSummary)
      .catch(() => {});
  }, [isAuthenticated, areaId, win]);

  // Drinking water is periodic (not windowed) — fetch once per area.
  React.useEffect(() => {
    if (!isAuthenticated || !areaId) return;
    fetchWater(areaId)
      .then(setWater)
      .catch(() => setWater(null));
    fetchLightning(areaId)
      .then(setLightning)
      .catch(() => setLightning(null));
  }, [isAuthenticated, areaId]);

  const s = data.solar,
    w = data.wind,
    cl = data.climate,
    aq = data.air;

  return (
    <Layout>
      <main className="dhc-main">
        <section className="dhc-hero" style={{ paddingBottom: "0.5rem" }}>
          <p style={{ margin: 0 }}>
            <Link to="/operator" className="dhc-nav-link">
              ← Areas
            </Link>
          </p>
          <h1 className="dhc-hero-title">{summary?.name || areaId}</h1>
          <p className="dhc-hero-subtitle">
            {areaId}
            {summary &&
              ` · ${summary.latitude}, ${summary.longitude} · weather ${summary.span_weather?.[0]}–${summary.span_weather?.[1]}`}
          </p>
        </section>

        {error && <p className="dhc-error">{error}</p>}
        {!areaId && (
          <p className="dhc-error">
            No area selected — open a dashboard from the Areas list.
          </p>
        )}

        {summary && (
          <Row>
            <Stat
              label="PV yield"
              value={summary.pv_yield_kwh_kwp}
              unit="kWh/kWp"
              hint={`optimal tilt ${summary.optimal_tilt_deg}°`}
            />
            <Stat
              label="Annual GHI"
              value={summary.annual_ghi_kwh_m2}
              unit="kWh/m²"
            />
            <Stat
              label="Wind CF @100m"
              value={summary.wind_cf_pct}
              unit="%"
              hint={`${summary.mean_wind_100m_ms} m/s mean`}
            />
            <Stat label="Mean temp" value={summary.mean_temp_c} unit="°C" />
            <Stat
              label="Rainfall"
              value={summary.annual_rain_mm}
              unit="mm/yr"
            />
            <Stat
              label="Heating / cooling"
              value={`${summary.hdd} / ${summary.cdd}`}
              unit="dd/yr"
            />
            <Stat
              label="Air quality"
              value={summary.aqi_band}
              hint={`PM2.5 ${summary.mean_pm25 ?? "—"} µg/m³`}
            />
            {lightning && (
              <Stat
                label="Lightning Ng"
                value={lightning.ng}
                unit="/km²/yr"
                hint={lightning.risk_level}
              />
            )}
          </Row>
        )}

        {lightning && (
          <div
            style={{
              ...card,
              marginTop: "0.9rem",
              borderLeft: "3px solid #e6a13a",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.6rem",
                alignItems: "baseline",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                ⚡ Surge protection · {lightning.standard}
              </strong>
              <span
                className="dhc-nav-pill"
                style={
                  lightning.spd_indication.includes("required")
                    ? { background: "rgba(224,102,102,0.18)", color: "#e06666" }
                    : { background: "rgba(230,161,58,0.18)", color: "#e6a13a" }
                }
              >
                SPD {lightning.spd_indication}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                Ng ≈ {lightning.ng} {lightning.unit} ({lightning.risk_level})
              </span>
            </div>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#c3cbd9",
                margin: "0.5rem 0 0.2rem",
              }}
            >
              {lightning.note}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#6c7689", margin: 0 }}>
              {lightning.source}
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginTop: "1.3rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            Averaging window:
          </span>
          <select
            className="dhc-form-input"
            style={{ maxWidth: 200, display: "inline-block" }}
            value={win}
            onChange={(e) => setWin(e.target.value)}
          >
            {WINDOWS.map(([v, lbl]) => (
              <option key={v} value={v}>
                {lbl}
              </option>
            ))}
          </select>
          {summary && (
            <span style={{ fontSize: "0.75rem", color: "#6c7689" }}>
              {summary.span_weather?.[0]} → {summary.span_weather?.[1]}
            </span>
          )}
        </div>

        <nav
          style={{
            display: "flex",
            gap: "0.4rem",
            margin: "1rem 0 1rem",
            flexWrap: "wrap",
          }}
        >
          {TABS.map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`dhc-button-base ${
                tab === k ? "dhc-button-primary" : "dhc-button-secondary"
              }`}
            >
              {lbl}
            </button>
          ))}
        </nav>

        {tab === "solar" && s && (
          <Row>
            <ChartCard title="Monthly irradiance (kWh/m²/day)">
              <EChart option={opt.monthlyIrradiance(s)} />
            </ChartCard>
            <ChartCard title="Sun path (azimuth × elevation)">
              <EChart option={opt.sunPath(s)} />
            </ChartCard>
            <ChartCard title="Irradiance by hour × month (W/m²)">
              <EChart option={opt.irradianceHeatmap(s)} height={340} />
            </ChartCard>
            <ChartCard
              title={`Tilt → annual yield (optimum ${s.optimal_tilt}°)`}
            >
              <EChart option={opt.tiltYield(s)} />
            </ChartCard>
          </Row>
        )}
        {tab === "wind" && w && (
          <Row>
            <ChartCard title="Wind rose @100 m (% of time)">
              <EChart option={opt.windRose(w)} height={360} />
            </ChartCard>
            <ChartCard title="Speed distribution + Weibull fit">
              <EChart option={opt.weibullHist(w)} />
            </ChartCard>
            <ChartCard title="Monthly mean wind @100 m">
              <EChart option={opt.monthlyWind(w)} />
            </ChartCard>
            <ChartCard title="Turbine capacity factor">
              <EChart
                option={opt.gauge(w.capacity_factor_pct, "capacity factor")}
                height={260}
              />
            </ChartCard>
          </Row>
        )}
        {tab === "climate" && cl && (
          <Row>
            <ChartCard title="Monthly temperature (min / mean / max)">
              <EChart option={opt.tempBand(cl)} />
            </ChartCard>
            <ChartCard title="Degree-days (heating / cooling)">
              <EChart option={opt.degreeDays(cl)} />
            </ChartCard>
            <ChartCard title="Temperature duration curve">
              <EChart option={opt.durationCurve(cl)} />
            </ChartCard>
          </Row>
        )}
        {tab === "water" && (
          <>
            {cl?.rain && (
              <Row>
                <ChartCard title="Monthly precipitation (mm)">
                  <EChart option={opt.precipBars(cl.rain)} />
                </ChartCard>
                <div style={{ ...card, flex: "1 1 300px", minWidth: 260 }}>
                  <h4
                    style={{
                      margin: "0 0 0.6rem",
                      fontSize: "0.9rem",
                      color: "#c3cbd9",
                    }}
                  >
                    Rainfall
                  </h4>
                  <Row>
                    <Stat label="Annual" value={cl.rain.annual_mm} unit="mm" />
                    <Stat
                      label="Wet days"
                      value={cl.rain.wet_days}
                      unit="/yr"
                    />
                    <Stat
                      label="Max daily"
                      value={cl.rain.max_daily_mm}
                      unit="mm"
                    />
                  </Row>
                </div>
              </Row>
            )}
            <h3 style={{ margin: "1.4rem 0 0.6rem" }}>
              Drinking water quality
            </h3>
            {water === undefined ? (
              <p style={{ color: "#9ca3af" }}>Loading…</p>
            ) : water ? (
              <>
                <Row>
                  <Stat
                    label="Compliance"
                    value={water.compliance_pct}
                    unit="%"
                    hint={`${water.n_samples} samples · ${water.commune}`}
                  />
                  <Stat
                    label="Sampled"
                    value={water.sampled_span?.[0]}
                    hint={`to ${water.sampled_span?.[1]}`}
                  />
                </Row>
                <Row>
                  {(water.parameters || []).map((p) => (
                    <div
                      key={p.key}
                      style={{ ...card, flex: "1 1 180px", minWidth: 160 }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                        {p.value}
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#9ca3af",
                            fontWeight: 400,
                          }}
                        >
                          {" "}
                          {p.unit}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#6c7689" }}>
                        {p.limit != null ? `limit ${p.limit}` : " "} · {p.date}
                      </div>
                    </div>
                  ))}
                </Row>
                <p style={{ fontSize: "0.72rem", color: "#6c7689" }}>
                  Source: {water.source}
                </p>
              </>
            ) : (
              <p style={{ color: "#9ca3af" }}>
                No open drinking-water dataset for this area. France is covered
                via Hub'Eau; Germany and Belgium have no unified public API yet.
              </p>
            )}
          </>
        )}
        {tab === "air" &&
          (aq ? (
            <Row>
              <ChartCard
                title={`Monthly pollutants (µg/m³) · ${aq.span?.[0]}–${aq.span?.[1]}`}
              >
                <EChart option={opt.pollutants(aq)} />
              </ChartCard>
              <ChartCard title="Days per year over WHO limits">
                <EChart option={opt.daysOverLimit(aq)} />
              </ChartCard>
            </Row>
          ) : (
            <p style={{ color: "#9ca3af" }}>
              No air-quality data for this area.
            </p>
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
