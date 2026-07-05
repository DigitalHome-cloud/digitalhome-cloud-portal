import * as React from "react";

// Client-only ECharts wrapper. echarts touches window/document, so we load it
// dynamically after mount — Gatsby SSR renders a placeholder, the browser
// hydrates and draws the chart. No global theme registration; colours come from
// each option (see options.js) so both build and runtime stay window-safe.
const EChart = ({ option, height = 300 }) => {
  const [ReactECharts, setReactECharts] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    import("echarts-for-react").then((mod) => {
      if (mounted) setReactECharts(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const style = { height, width: "100%" };
  if (!ReactECharts) return <div style={{ ...style, opacity: 0.35 }} />;
  return (
    <ReactECharts
      option={option}
      style={style}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas" }}
    />
  );
};

export default EChart;
