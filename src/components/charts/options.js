// ECharts option builders for the area renewables dashboards. Each takes a gold
// JSON block and returns a themed `option`. Dark slate/blue palette, no global
// theme registration (keeps SSR/build window-safe).

const TXT = "#c3cbd9";
const DIM = "#6c7689";
const GRID = "#2b3346";
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const C = {
  ghi: "#e6a13a", dni: "#f6c453", dhi: "#8a72c9",
  wind: "#48c996", temp: "#6c9dff",
  pm: "#e06666", pm10: "#e0a13a", no2: "#6c9dff", o3: "#48c996",
  hdd: "#6c9dff", cdd: "#e06666",
};
const ROSE = ["#1b3a5b", "#2f7fb8", "#48c996", "#e6a13a", "#e06666"];

const axis = () => ({
  axisLine: { lineStyle: { color: GRID } },
  axisLabel: { color: DIM },
  splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
  nameTextStyle: { color: DIM },
});
const base = () => ({
  backgroundColor: "transparent",
  textStyle: { color: TXT },
  grid: { left: 52, right: 20, top: 34, bottom: 34 },
  legend: { textStyle: { color: TXT }, top: 4 },
});
const barS = (name, data, color) => ({ name, type: "bar", data, itemStyle: { color } });
const lineS = (name, data, color) => ({
  name, type: "line", data, smooth: true, showSymbol: false,
  lineStyle: { color, width: 2 }, itemStyle: { color },
});

export function monthlyIrradiance(s) {
  const m = s.monthly;
  return {
    ...base(), tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: MONTHS, ...axis() },
    yAxis: { type: "value", name: "kWh/m²/day", ...axis() },
    series: [barS("GHI", m.ghi, C.ghi), barS("DNI", m.dni, C.dni), barS("DHI", m.dhi, C.dhi)],
  };
}

export function sunPath(s) {
  const a = s.sun_path;
  const arcs = [["summer", "Summer solstice", C.dni],
                ["equinox", "Equinox", C.ghi],
                ["winter", "Winter solstice", C.dhi]];
  return {
    ...base(),
    tooltip: { trigger: "item", formatter: (p) => `az ${p.value[0]}° · el ${p.value[1]}°` },
    xAxis: { type: "value", name: "Azimuth °", min: 0, max: 360, interval: 45, ...axis() },
    yAxis: { type: "value", name: "Elevation °", min: 0, max: 90, ...axis() },
    series: arcs.filter(([k]) => a[k] && a[k].length).map(([k, name, color]) =>
      lineS(name, a[k].map((p) => [p.az, p.el]), color)),
  };
}

export function irradianceHeatmap(s) {
  const data = [];
  let max = 0;
  s.heatmap.forEach((row, mi) => row.forEach((v, h) => { data.push([h, mi, Math.round(v)]); if (v > max) max = v; }));
  return {
    ...base(),
    tooltip: { position: "top", formatter: (p) => `${MONTHS[p.value[1]]} ${p.value[0]}:00 — ${p.value[2]} W/m²` },
    grid: { left: 46, right: 16, top: 16, bottom: 56 },
    xAxis: { type: "category", data: [...Array(24).keys()], name: "Hour", ...axis() },
    yAxis: { type: "category", data: MONTHS, ...axis() },
    visualMap: {
      min: 0, max: Math.round(max), calculable: true, orient: "horizontal",
      left: "center", bottom: 0, textStyle: { color: DIM },
      inRange: { color: ["#0d1b2a", "#1b3a5b", "#e6a13a", "#f6e27a"] },
    },
    series: [{ type: "heatmap", data }],
  };
}

export function tiltYield(s) {
  const t = s.tilt_curve;
  const oi = t.tilt.indexOf(s.optimal_tilt);
  return {
    ...base(), legend: { show: false },
    tooltip: { trigger: "axis", formatter: (p) => `${p[0].axisValue}° → ${p[0].value} kWh/m²/yr` },
    xAxis: { type: "category", data: t.tilt, name: "Tilt °", ...axis() },
    yAxis: { type: "value", name: "Annual POA kWh/m²", scale: true, ...axis() },
    series: [{
      type: "line", data: t.poa, smooth: true, showSymbol: false,
      lineStyle: { color: C.ghi, width: 2 }, areaStyle: { color: "rgba(230,161,58,0.12)" },
      markPoint: { symbolSize: 46, data: [{ coord: [String(s.optimal_tilt), t.poa[oi]], value: `${s.optimal_tilt}°`, itemStyle: { color: C.dni } }] },
    }],
  };
}

export function windRose(w) {
  const r = w.rose;
  return {
    ...base(), tooltip: { trigger: "item" }, grid: undefined,
    legend: { textStyle: { color: TXT }, bottom: 0 },
    polar: { radius: "68%", center: ["50%", "48%"] },
    angleAxis: { type: "category", data: r.dirs, axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: TXT } },
    radiusAxis: { axisLabel: { color: DIM }, splitLine: { lineStyle: { color: GRID } } },
    series: r.speed_bins.map((sb, i) => ({
      name: `${sb} m/s`, type: "bar", coordinateSystem: "polar", stack: "w",
      data: r.matrix.map((row) => row[i]), itemStyle: { color: ROSE[i] },
    })),
  };
}

export function weibullHist(w) {
  const { edges, density } = w.hist;
  const { k, c } = w.weibull;
  const pdf = edges.map((v) => (v <= 0 ? 0 : (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k))));
  return {
    ...base(), tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: edges, name: "m/s", ...axis() },
    yAxis: { type: "value", name: "density", ...axis() },
    series: [barS("Observed", density, C.wind), lineS(`Weibull k=${k}`, pdf, C.dni)],
  };
}

export function monthlyWind(w) {
  return {
    ...base(), tooltip: { trigger: "axis" }, legend: { show: false },
    xAxis: { type: "category", data: MONTHS, ...axis() },
    yAxis: { type: "value", name: "m/s", ...axis() },
    series: [barS("Mean wind @100 m", w.monthly_mean_ms, C.wind)],
  };
}

export function gauge(value, label, max = 50) {
  return {
    ...base(), legend: { show: false },
    series: [{
      type: "gauge", min: 0, max, radius: "92%", progress: { show: true, width: 12 },
      axisLine: { lineStyle: { width: 12, color: [[1, GRID]] } },
      axisLabel: { color: DIM, distance: 14 }, axisTick: { show: false },
      splitLine: { lineStyle: { color: DIM } }, pointer: { show: false }, anchor: { show: false },
      title: { color: DIM, fontSize: 12, offsetCenter: [0, "78%"] },
      detail: { formatter: "{value}%", color: C.wind, fontSize: 24, offsetCenter: [0, 0] },
      data: [{ value, name: label }], itemStyle: { color: C.wind },
    }],
  };
}

export function tempBand(cl) {
  const m = cl.monthly;
  const diff = m.max.map((v, i) => Math.round((v - m.min[i]) * 10) / 10);
  return {
    ...base(), tooltip: { trigger: "axis" }, legend: { data: ["Mean"], textStyle: { color: TXT } },
    xAxis: { type: "category", data: MONTHS, boundaryGap: false, ...axis() },
    yAxis: { type: "value", name: "°C", scale: true, ...axis() },
    series: [
      { name: "min", type: "line", data: m.min, stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true },
      { name: "range", type: "line", data: diff, stack: "band", lineStyle: { opacity: 0 }, areaStyle: { color: "rgba(108,157,255,0.18)" }, symbol: "none", silent: true },
      { name: "Mean", ...lineS("Mean", m.mean, C.temp) },
    ],
  };
}

export function degreeDays(cl) {
  const m = cl.monthly;
  return {
    ...base(), tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: MONTHS, ...axis() },
    yAxis: { type: "value", name: "degree-days", ...axis() },
    series: [barS("Heating (HDD)", m.hdd, C.hdd), barS("Cooling (CDD)", m.cdd, C.cdd)],
  };
}

export function durationCurve(cl) {
  const n = cl.duration_curve.length;
  return {
    ...base(), legend: { show: false },
    tooltip: { trigger: "axis", formatter: (p) => `${p[0].value} °C exceeded ${p[0].dataIndex ? Math.round((p[0].dataIndex / n) * 100) : 0}% of the time` },
    xAxis: { type: "category", data: cl.duration_curve.map((_, i) => Math.round((i / n) * 100)), name: "% of hours", ...axis() },
    yAxis: { type: "value", name: "°C", scale: true, ...axis() },
    series: [{ type: "line", data: cl.duration_curve, showSymbol: false, smooth: true, lineStyle: { color: C.temp, width: 2 }, areaStyle: { color: "rgba(108,157,255,0.10)" } }],
  };
}

export function pollutants(aq) {
  const m = aq.monthly;
  return {
    ...base(), tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: MONTHS, ...axis() },
    yAxis: { type: "value", name: "µg/m³", ...axis() },
    series: [lineS("PM2.5", m.pm2_5, C.pm), lineS("PM10", m.pm10, C.pm10),
             lineS("NO₂", m.nitrogen_dioxide, C.no2), lineS("O₃", m.ozone, C.o3)],
  };
}

export function daysOverLimit(aq) {
  const d = aq.days_over_who;
  return {
    ...base(), legend: { show: false }, tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: ["PM2.5", "PM10", "NO₂", "O₃"], ...axis() },
    yAxis: { type: "value", name: "days/yr over WHO limit", ...axis() },
    series: [barS("Days", [d.pm2_5, d.pm10, d.nitrogen_dioxide, d.ozone], C.pm)],
  };
}
