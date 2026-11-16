import React, { useEffect, useState } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { bytes, configurations, shortId, vaultItemUrl, vaultItems } from "../utils/homeConfig";
import { HomeBar, NoHomeId, errText, useHomeId } from "./HomeConfigurations";

// A home's vault (darkfactory ADR 0019): photos and documents, grouped by the
// configuration version or planning option they document. Only the home's
// owners and dhc-admins see it. Files go up from an edge; here they are read.

const ICON = { document: "📄", video: "🎞", other: "📦", photo: "🖼" };

const HomeVault = () => {
  const { t } = useTranslation();
  const home = useHomeId();
  const [items, setItems] = useState(null);
  const [conf, setConf] = useState(null);
  const [error, setError] = useState("");

  const load = React.useCallback(async () => {
    if (!home.homeId) return;
    setError("");
    try {
      const [its, c] = await Promise.all([vaultItems(home.homeId), configurations(home.homeId).catch(() => null)]);
      setItems(its);
      setConf(c);
    } catch (e) {
      setError(errText(e));
    }
  }, [home.homeId]);
  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  if (!home.homeId)
    return (
      <>
        <HomeBar home={home} />
        <NoHomeId home={home} />
      </>
    );

  const open = async (it) => {
    try {
      const r = await vaultItemUrl(home.homeId, it.sha256);
      if (r?.url) window.open(r.url, "_blank", "noopener");
    } catch (e) {
      setError(errText(e));
    }
  };

  // One group per configVersion: the live version first, then open options,
  // then older versions newest first, then anything not grouped.
  const versions = conf?.versions || [];
  const options = conf?.options || [];
  const label = (g) => {
    if (!g) return t("homeVault.ungrouped", { defaultValue: "Not grouped" });
    const v = versions.find((x) => x.id === g);
    const o = options.find((x) => x.id === g);
    if (v) return `${shortId(home.homeId, g)} · ${t(`homeConfig.st.${v.status}`, { defaultValue: v.status })}`;
    if (o) return `${shortId(home.homeId, g)} · ${o.label}`;
    return shortId(home.homeId, g);
  };
  const rank = (g) => (!g ? 3 : g === conf?.live ? 0 : options.some((o) => o.id === g) ? 1 : 2);
  const groups = {};
  (items || []).forEach((it) => {
    const g = it.configVersion || "";
    (groups[g] = groups[g] || []).push(it);
  });
  const keys = Object.keys(groups).sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? b.localeCompare(a) : a.localeCompare(b)));
  const name = (it) => it.caption || it.name;

  return (
    <div>
      <HomeBar home={home}>
        <button type="button" className="ov-btn ov-btn--ghost" onClick={load}>
          {t("homeConfig.refresh", { defaultValue: "Refresh" })}
        </button>
      </HomeBar>
      {error && <p className="ov-err">{error}</p>}
      {items === null && !error && <p className="ov-page-sub">{t("homeConfig.loading", { defaultValue: "Loading …" })}</p>}
      {items && !items.length && (
        <p className="ov-page-sub">
          {t("homeVault.empty", { defaultValue: "The vault is empty. An edge sends a workspace's photos and documents here." })}
        </p>
      )}
      {keys.map((g) => (
        <section key={g || "none"} className="hv-group">
          <h2 className="hc-h">
            {label(g)} <small className="hc-dim">{groups[g].length}</small>
          </h2>
          <div className="hv-grid">
            {[...groups[g]]
              .sort((a, b) => name(a).localeCompare(name(b)))
              .map((it) => (
                <button
                  type="button"
                  key={it.sha256}
                  className="hv-item"
                  onClick={() => open(it)}
                  title={
                    it.kind === "photo"
                      ? t("homeVault.view", { defaultValue: "View" })
                      : t("homeVault.download", { defaultValue: "Download" })
                  }
                >
                  <span className="hv-thumb">
                    {it.thumbUrl ? <img src={it.thumbUrl} alt="" loading="lazy" /> : <span>{ICON[it.kind] || ICON.other}</span>}
                  </span>
                  <span className="hv-name">{name(it)}</span>
                  <span className="hv-meta">
                    {t(`homeVault.kind.${it.kind}`, { defaultValue: it.kind })} · {bytes(it.size)}
                  </span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default HomeVault;
