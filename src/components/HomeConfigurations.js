import React, { useEffect, useState } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useSmartHome } from "../context/SmartHomeContext";
import ConfigGraph from "./ConfigGraph";
import { compare, configurations, graphText, graphUrl, homeIdOf, shortId } from "../utils/homeConfig";

// A home's configurations (darkfactory ADR 0018): the live one, the versions
// before it, the planning options, and a compare of any two. Read-only here:
// options are worked on, pushed and promoted from an edge.

const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");
export const errText = (e) => e?.errors?.[0]?.message || e?.message || String(e);

export const useHomeId = () => {
  const { activeHome } = useSmartHome();
  const smartHomeId = activeHome?.id || "";
  const [state, setState] = useState({ smartHomeId, homeId: "", loading: true, error: "" });
  useEffect(() => {
    let gone = false;
    if (!smartHomeId) {
      setState({ smartHomeId, homeId: "", loading: false, error: "" });
      return undefined;
    }
    setState((s) => ({ ...s, smartHomeId, loading: true, error: "" }));
    homeIdOf(smartHomeId)
      .then((homeId) => !gone && setState({ smartHomeId, homeId, loading: false, error: "" }))
      .catch((e) => !gone && setState({ smartHomeId, homeId: "", loading: false, error: errText(e) }));
    return () => {
      gone = true;
    };
  }, [smartHomeId]);
  return state;
};

export const HomeBar = ({ home, children }) => {
  const { t } = useTranslation();
  return (
    <div className="ov-bar">
      <span className="ov-pill" title={t("homeConfig.activeHome", { defaultValue: "Active SmartHome" })}>
        {home.smartHomeId || "—"}
      </span>
      {home.homeId && (
        <span className="hc-mono hc-dim" title={t("homeConfig.homeIdHint", { defaultValue: "The home's permanent id" })}>
          {home.homeId}
        </span>
      )}
      <div className="ov-bar-spacer" />
      {children}
    </div>
  );
};

export const NoHomeId = ({ home }) => {
  const { t } = useTranslation();
  if (home.loading) return <p className="ov-page-sub">{t("homeConfig.loading", { defaultValue: "Loading …" })}</p>;
  if (home.error) return <p className="ov-err">{home.error}</p>;
  if (!home.smartHomeId)
    return <p className="ov-page-sub">{t("homeConfig.noHome", { defaultValue: "Choose a SmartHome first (Fleet)." })}</p>;
  return (
    <p className="ov-page-sub">
      {t("homeConfig.noHomeId", {
        defaultValue:
          "This home has no permanent id yet. It gets one when an edge linked to it lists its homes; until then it has no configurations or vault.",
      })}
    </p>
  );
};

const Diff = ({ diff }) => {
  const { t } = useTranslation();
  if (!diff) return null;
  if (!diff.added.length && !diff.removed.length && !diff.changed.length)
    return <p className="ov-page-sub">{t("homeConfig.same", { defaultValue: "No difference." })}</p>;
  const row = (kind, sign, d) => (
    <li key={kind + d.id} className={`hc-d hc-d--${kind}`}>
      <b>{sign}</b> {d.type} <span>{d.label || d.id}</span>
      {d.changes && (
        <ul>
          {d.changes.map((c) => (
            <li key={c.property}>
              <span className="hc-mono">{c.property}</span>: {c.before.join(", ") || "—"} → {c.after.join(", ") || "—"}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
  return (
    <ul className="hc-diff">
      {diff.added.map((d) => row("add", "+", d))}
      {diff.removed.map((d) => row("del", "−", d))}
      {diff.changed.map((d) => row("chg", "~", d))}
    </ul>
  );
};

const HomeConfigurations = () => {
  const { t } = useTranslation();
  const home = useHomeId();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = React.useCallback(async () => {
    if (!home.homeId) return;
    setError("");
    try {
      const d = await configurations(home.homeId);
      setData(d);
      const versions = d.versions || [];
      const options = (d.options || []).filter((o) => o.status === "open");
      // default compare: the live version against its first open option, else the version before it
      setFrom(d.live || "");
      setTo(options[0]?.id || (versions.find((v) => v.id !== d.live) || {}).id || "");
    } catch (e) {
      setError(errText(e));
    }
  }, [home.homeId]);
  useEffect(() => {
    setData(null);
    setDiff(null);
    load();
  }, [load]);

  if (!home.homeId)
    return (
      <>
        <HomeBar home={home} />
        <NoHomeId home={home} />
      </>
    );

  const s = (id) => shortId(home.homeId, id);
  const choices = [...(data?.versions || []).map((v) => v.id), ...(data?.options || []).map((o) => o.id)];
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const [a, b] = await Promise.all([graphText(home.homeId, from), graphText(home.homeId, to)]);
      setDiff(await compare(a, b));
    } catch (e) {
      setError(errText(e));
    }
    setBusy(false);
  };
  const download = async (id) => {
    try {
      const g = await graphUrl(home.homeId, id);
      if (g?.url) window.open(g.url, "_blank", "noopener");
    } catch (e) {
      setError(errText(e));
    }
  };
  const status = (v) => t(`homeConfig.st.${v.status}`, { defaultValue: v.status });

  return (
    <div>
      <HomeBar home={home}>
        <button type="button" className="ov-btn ov-btn--ghost" onClick={load}>
          {t("homeConfig.refresh", { defaultValue: "Refresh" })}
        </button>
      </HomeBar>
      {error && <p className="ov-err">{error}</p>}
      {!data ? (
        !error && <p className="ov-page-sub">{t("homeConfig.loading", { defaultValue: "Loading …" })}</p>
      ) : (
        <>
          <h2 className="hc-h">{t("homeConfig.versions", { defaultValue: "Versions" })}</h2>
          {!(data.versions || []).length ? (
            <p className="ov-page-sub">
              {t("homeConfig.noVersions", {
                defaultValue: "No configuration yet. An edge publishes the installation as it is (a survey) as the first live one.",
              })}
            </p>
          ) : (
            <div className="ov-tablewrap">
              <table className="ov-table">
                <thead>
                  <tr>
                    <th>{t("homeConfig.version", { defaultValue: "Version" })}</th>
                    <th>{t("homeConfig.status", { defaultValue: "Status" })}</th>
                    <th>{t("homeConfig.what", { defaultValue: "What changed" })}</th>
                    <th>{t("homeConfig.when", { defaultValue: "When" })}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.versions.map((v) => (
                    <tr key={v.id}>
                      <td className="hc-mono">
                        {v.version}
                        {v.fromOption ? <small> ← {s(v.fromOption)}</small> : null}
                      </td>
                      <td>
                        <span className={`hc-st hc-st--${v.status}`}>{status(v)}</span>
                      </td>
                      <td>{v.summary}</td>
                      <td>
                        {when(v.at)}
                        <br />
                        <small className="hc-dim">{v.by}</small>
                      </td>
                      <td>
                        <button type="button" className="ov-btn ov-btn--ghost" onClick={() => download(v.id)}>
                          .ttl
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="hc-h">{t("homeConfig.options", { defaultValue: "Planning options" })}</h2>
          {!(data.options || []).length ? (
            <p className="ov-page-sub">
              {t("homeConfig.noOptions", { defaultValue: "No planning option. An edge creates one, based on the live version." })}
            </p>
          ) : (
            <div className="ov-tablewrap">
              <table className="ov-table">
                <thead>
                  <tr>
                    <th>{t("homeConfig.option", { defaultValue: "Option" })}</th>
                    <th>{t("homeConfig.label", { defaultValue: "Name" })}</th>
                    <th>{t("homeConfig.basedOn", { defaultValue: "Based on" })}</th>
                    <th>{t("homeConfig.status", { defaultValue: "Status" })}</th>
                    <th>{t("homeConfig.when", { defaultValue: "When" })}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.options.map((o) => (
                    <tr key={o.id}>
                      <td className="hc-mono">
                        {s(o.id)} <small>v{o.version}</small>
                      </td>
                      <td>{o.label}</td>
                      <td className="hc-mono">{s(o.basedOn)}</td>
                      <td>
                        {o.status === "promoted"
                          ? t("homeConfig.promotedTo", { defaultValue: "promoted to {{v}}", v: s(o.promotedTo) })
                          : t("homeConfig.open", { defaultValue: "open" })}
                      </td>
                      <td>
                        {when(o.updatedAt)}
                        <br />
                        <small className="hc-dim">{o.updatedBy}</small>
                      </td>
                      <td>
                        <button type="button" className="ov-btn ov-btn--ghost" onClick={() => download(o.id)}>
                          .ttl
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {choices.length > 1 && (
            <>
              <h2 className="hc-h">{t("homeConfig.compare", { defaultValue: "Compare" })}</h2>
              <div className="hc-compare">
                <select
                  className="ov-input"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setDiff(null);
                  }}
                >
                  {choices.map((id) => (
                    <option key={id} value={id}>
                      {s(id)}
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select
                  className="ov-input"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setDiff(null);
                  }}
                >
                  {choices.map((id) => (
                    <option key={id} value={id}>
                      {s(id)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ov-btn ov-btn--primary"
                  disabled={busy || !from || !to || from === to}
                  onClick={run}
                >
                  {busy ? "…" : t("homeConfig.go", { defaultValue: "Compare" })}
                </button>
              </div>
              <Diff diff={diff} />
            </>
          )}
          {choices.length > 0 && (
            <ConfigGraph key={home.homeId} homeId={home.homeId} choices={choices} live={data.live} onError={setError} />
          )}
        </>
      )}
    </div>
  );
};

export default HomeConfigurations;
