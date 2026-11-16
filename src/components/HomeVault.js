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
  const [urls, setUrls] = useState({}); // sha256 → presigned URL of a photo (inline)
  const [preview, setPreview] = useState(null); // { list, i }

  const load = React.useCallback(async () => {
    if (!home.homeId) return;
    setError("");
    try {
      const [its, c] = await Promise.all([vaultItems(home.homeId), configurations(home.homeId).catch(() => null)]);
      setItems(its);
      setConf(c);
      // photos without a thumbnail show the original itself (presigned, inline)
      const photos = its.filter((it) => it.kind === "photo" && !it.thumbUrl).slice(0, 60);
      const got = await Promise.all(photos.map((it) => vaultItemUrl(home.homeId, it.sha256).catch(() => null)));
      setUrls(Object.fromEntries(photos.map((it, i) => [it.sha256, got[i]?.url]).filter(([, u]) => u)));
    } catch (e) {
      setError(errText(e));
    }
  }, [home.homeId]);
  useEffect(() => {
    setItems(null);
    setUrls({});
    setPreview(null);
    load();
  }, [load]);

  // the preview: Escape closes it, the arrows go through the group's photos
  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPreview(null);
      if (e.key === "ArrowRight") setPreview((p) => ({ ...p, i: (p.i + 1) % p.list.length }));
      if (e.key === "ArrowLeft") setPreview((p) => ({ ...p, i: (p.i - 1 + p.list.length) % p.list.length }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  const current = preview ? preview.list[preview.i] : null;
  useEffect(() => {
    if (!current || urls[current.sha256]) return;
    vaultItemUrl(home.homeId, current.sha256)
      .then((r) => r?.url && setUrls((u) => ({ ...u, [current.sha256]: r.url })))
      .catch((e) => setError(errText(e)));
  }, [current, urls, home.homeId]);

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
              .map((it, _, sorted) => (
                <button
                  type="button"
                  key={it.sha256}
                  className="hv-item"
                  onClick={() => {
                    if (it.kind !== "photo") return open(it);
                    const list = sorted.filter((x) => x.kind === "photo");
                    return setPreview({ list, i: list.indexOf(it) });
                  }}
                  title={
                    it.kind === "photo"
                      ? t("homeVault.view", { defaultValue: "View" })
                      : t("homeVault.download", { defaultValue: "Download" })
                  }
                >
                  <span className="hv-thumb">
                    {it.thumbUrl || urls[it.sha256] ? <img src={it.thumbUrl || urls[it.sha256]} alt="" loading="lazy" /> : <span>{ICON[it.kind] || ICON.other}</span>}
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
      {current && (
        <div className="hv-preview" role="dialog" aria-modal="true" aria-label={name(current)} onClick={() => setPreview(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            {urls[current.sha256] ? <img src={urls[current.sha256]} alt={name(current)} /> : <span className="hv-wait">…</span>}
            <figcaption>
              <span>{name(current)}</span>
              <span className="hv-meta">
                {preview.i + 1} / {preview.list.length} · {bytes(current.size)}
              </span>
              <span className="hv-preview-acts">
                {preview.list.length > 1 && (
                  <>
                    <button type="button" className="ov-btn ov-btn--ghost" aria-label={t("homeVault.prev", { defaultValue: "Previous" })}
                      onClick={() => setPreview((p) => ({ ...p, i: (p.i - 1 + p.list.length) % p.list.length }))}>←</button>
                    <button type="button" className="ov-btn ov-btn--ghost" aria-label={t("homeVault.next", { defaultValue: "Next" })}
                      onClick={() => setPreview((p) => ({ ...p, i: (p.i + 1) % p.list.length }))}>→</button>
                  </>
                )}
                <button type="button" className="ov-btn ov-btn--ghost" onClick={() => open(current)}>
                  {t("homeVault.original", { defaultValue: "Original" })}
                </button>
                <button type="button" className="ov-btn ov-btn--ghost" onClick={() => setPreview(null)}>
                  {t("homeVault.close", { defaultValue: "Close" })}
                </button>
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
};

export default HomeVault;
