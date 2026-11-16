import React, { useMemo, useState } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphModel, graphText, layout, shortId, toJsonLd } from "../utils/homeConfig";

// A configuration as a graph (darkfactory ADR 0018): every node of a
// version or option, its links to other nodes, and its JSON-LD. Compared
// with another one, each node and link is coloured by what changed.

const expand = (ctx, id) => {
  const i = id.indexOf(":");
  return i > 0 && ctx[id.slice(0, i)] !== undefined ? ctx[id.slice(0, i)] + id.slice(i + 1) : id;
};

const W = 900;
const H = 560;

const ConfigGraph = ({ homeId, choices, live, onError }) => {
  const { t } = useTranslation();
  const [shown, setShown] = useState(live || choices[0] || "");
  const [against, setAgainst] = useState("");
  const [data, setData] = useState(null); // { model, pos, jsonld, ttl, shown, against }
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState(null);
  const [asJson, setAsJson] = useState(false);
  const s = (id) => shortId(homeId, id);

  const draw = async () => {
    setBusy(true);
    setPicked(null);
    try {
      const [a, b] = await Promise.all([graphText(homeId, shown), against ? graphText(homeId, against) : Promise.resolve(null)]);
      const model = await graphModel(a, b);
      setData({ model, pos: layout(model, W, H), jsonld: await toJsonLd(a), shown, against });
    } catch (e) {
      onError(e?.errors?.[0]?.message || e?.message || String(e));
    }
    setBusy(false);
  };

  const counts = useMemo(() => {
    const c = { added: 0, removed: 0, changed: 0, same: 0 };
    (data?.model.nodes || []).forEach((n) => { c[n.status] += 1; });
    return c;
  }, [data]);

  const download = () => {
    const blob = new Blob([JSON.stringify(data.jsonld, null, 2)], { type: "application/ld+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.shown}.jsonld`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const at = data ? new Map(data.model.nodes.map((n, i) => [n.iri, i])) : new Map();
  const node = picked != null && data ? data.model.nodes[picked] : null;
  const nodeJson = node
    ? data.jsonld["@graph"].find((g) => expand(data.jsonld["@context"], g["@id"]) === node.iri)
    : null;

  return (
    <>
      <h2 className="hc-h">{t("homeConfig.graph", { defaultValue: "Graph" })}</h2>
      <div className="hc-compare">
        <select className="ov-input" value={shown} onChange={(e) => setShown(e.target.value)}>
          {choices.map((id) => <option key={id} value={id}>{s(id)}</option>)}
        </select>
        <span className="hc-dim">{t("homeConfig.against", { defaultValue: "compared with" })}</span>
        <select className="ov-input" value={against} onChange={(e) => setAgainst(e.target.value)}>
          <option value="">{t("homeConfig.nothing", { defaultValue: "— nothing —" })}</option>
          {choices.filter((id) => id !== shown).map((id) => <option key={id} value={id}>{s(id)}</option>)}
        </select>
        <button type="button" className="ov-btn ov-btn--primary" disabled={busy || !shown} onClick={draw}>
          {busy ? "…" : t("homeConfig.draw", { defaultValue: "Show" })}
        </button>
        {data && (
          <>
            <button type="button" className="ov-btn ov-btn--ghost" onClick={() => setAsJson((v) => !v)}>
              {asJson ? t("homeConfig.asGraph", { defaultValue: "Graph" }) : "JSON-LD"}
            </button>
            <button type="button" className="ov-btn ov-btn--ghost" onClick={download}>.jsonld</button>
          </>
        )}
      </div>
      {data && data.against && (
        <p className="hc-legend">
          <span className="hc-k hc-k--added">{t("homeConfig.k.added", { defaultValue: "added" })} {counts.added}</span>
          <span className="hc-k hc-k--removed">{t("homeConfig.k.removed", { defaultValue: "removed" })} {counts.removed}</span>
          <span className="hc-k hc-k--changed">{t("homeConfig.k.changed", { defaultValue: "changed" })} {counts.changed}</span>
          <span className="hc-k hc-k--same">{t("homeConfig.k.same", { defaultValue: "same" })} {counts.same}</span>
          <span className="hc-dim">{t("homeConfig.k.from", { defaultValue: "{{a}} → {{b}}", a: s(data.against), b: s(data.shown) })}</span>
        </p>
      )}
      {data && asJson && <pre className="hc-json">{JSON.stringify(data.jsonld, null, 2)}</pre>}
      {data && !asJson && (
        <div className="hc-graphwrap">
          <svg className="hc-graph" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("homeConfig.graph", { defaultValue: "Graph" })}>
            {data.model.links.map((l, i) => {
              const a = data.pos[at.get(l.from)], b = data.pos[at.get(l.to)];
              if (!a || !b) return null;
              return (
                <g key={`l${i}`} className={`hc-link hc-link--${l.status}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  <title>{l.property}</title>
                </g>
              );
            })}
            {data.model.nodes.map((n, i) => {
              const p = data.pos[i];
              const text = (n.label || n.id).slice(0, 22);
              return (
                <g key={n.iri} className={`hc-node hc-node--${n.status}${picked === i ? " hc-node--picked" : ""}`}
                  transform={`translate(${p.x},${p.y})`} onClick={() => setPicked(i)} tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPicked(i)}>
                  <rect x={-58} y={-15} width={116} height={30} rx={7} />
                  <text y={-2}>{text}</text>
                  <text y={10} className="hc-node-type">{n.type}</text>
                  <title>{`${n.type} ${n.label || n.id}`}</title>
                </g>
              );
            })}
          </svg>
          {node && (
            <aside className="hc-side">
              <b>{node.label || node.id}</b>
              <div className="hc-dim">{node.type} · {t(`homeConfig.k.${node.status}`, { defaultValue: node.status })}</div>
              <dl>
                {Object.entries(node.props).map(([k, v]) => (
                  <React.Fragment key={k}><dt>{k}</dt><dd>{v.join(", ")}</dd></React.Fragment>
                ))}
              </dl>
              {nodeJson && <pre className="hc-json hc-json--small">{JSON.stringify(nodeJson, null, 2)}</pre>}
              {node.status === "removed" && <p className="hc-dim">{t("homeConfig.k.onlyIn", { defaultValue: "Only in {{v}}.", v: s(data.against) })}</p>}
            </aside>
          )}
        </div>
      )}
    </>
  );
};

export default ConfigGraph;
