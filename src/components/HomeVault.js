import React, { useEffect, useState } from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { bytes, configurations, shortId, tagVaultItems, vaultItemUrl, vaultItems } from "../utils/homeConfig";
import { HomeBar, NoHomeId, errText, useHomeId } from "./HomeConfigurations";

// A home's vault (darkfactory ADR 0019): photos and documents, each tagged
// with the configuration versions or planning options it documents (one or
// several). Filter by tags; select several items to add or remove a tag.
// Only the home's owners and dhc-admins see it. Files go up from an edge.

const NONE = "";   // the filter chip for items without a tag

const ICON = { document: "📄", video: "🎞", other: "📦", photo: "🖼" };

const HomeVault = () => {
  const { t } = useTranslation();
  const home = useHomeId();
  const [items, setItems] = useState(null);
  const [conf, setConf] = useState(null);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState({}); // sha256 → presigned URL of a photo (inline)
  const [preview, setPreview] = useState(null); // { list, i }
  const [filter, setFilter] = useState([]); // tags shown (any of them); [] = all
  const [picked, setPicked] = useState([]); // selected sha256s
  const [tagTo, setTagTo] = useState("");
  const [busy, setBusy] = useState(false);

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
    setFilter([]);
    setPicked([]);
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

  // The tags: the live version first, then open options, then older
  // versions newest first; ids no longer listed (a withdrawn one) last.
  const versions = conf?.versions || [];
  const options = conf?.options || [];
  const label = (g) => {
    if (g === NONE) return t("homeVault.untagged", { defaultValue: "No tag" });
    const v = versions.find((x) => x.id === g);
    const o = options.find((x) => x.id === g);
    if (v) return `${shortId(home.homeId, g)} · ${t(`homeConfig.st.${v.status}`, { defaultValue: v.status })}`;
    if (o) return `${shortId(home.homeId, g)} · ${o.label}`;
    return shortId(home.homeId, g);
  };
  const rank = (g) =>
    g === NONE ? 4 : g === conf?.live ? 0 : options.some((o) => o.id === g && o.status === "open") ? 1 : versions.some((v) => v.id === g) ? 2 : 3;
  const order = (a, b) => rank(a) - rank(b) || (rank(a) === 2 ? b.localeCompare(a) : a.localeCompare(b));
  const all = items || [];
  const count = {};
  all.forEach((it) => (it.tags.length ? it.tags : [NONE]).forEach((g) => (count[g] = (count[g] || 0) + 1)));
  const chips = Object.keys(count).sort(order);
  const choices = [...new Set([...(conf?.live ? [conf.live] : []), ...options.filter((o) => o.status === "open").map((o) => o.id), ...versions.map((v) => v.id)])];
  const name = (it) => it.caption || it.name;
  const shown = all
    .filter((it) => !filter.length || filter.some((g) => (g === NONE ? !it.tags.length : it.tags.includes(g))))
    .sort((a, b) => name(a).localeCompare(name(b)));
  const isPicked = (it) => picked.includes(it.sha256);
  const toggle = (sha) => setPicked((p) => (p.includes(sha) ? p.filter((x) => x !== sha) : [...p, sha]));
  const pickedItems = all.filter(isPicked);

  const applyTag = async (mode) => {
    const g = tagTo || conf?.live;
    if (!g || !picked.length) return;
    setBusy(true);
    setError("");
    try {
      const out = await tagVaultItems(home.homeId, picked, mode === "add" ? { add: [g] } : { remove: [g] });
      const next = Object.fromEntries(out.map((x) => [x.sha256, x.tags]));
      setItems((its) => its.map((it) => (next[it.sha256] ? { ...it, tags: next[it.sha256], configVersion: next[it.sha256][0] || null } : it)));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

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
      {all.length > 0 && (
        <div className="hv-filters" role="group" aria-label={t("homeVault.filter", { defaultValue: "Filter by tag" })}>
          <button type="button" className={`hv-chip${filter.length ? "" : " hv-chip--on"}`} aria-pressed={!filter.length} onClick={() => setFilter([])}>
            {t("homeVault.all", { defaultValue: "All" })} <small>{all.length}</small>
          </button>
          {chips.map((g) => {
            const on = filter.includes(g);
            return (
              <button type="button" key={g || "none"} className={`hv-chip${on ? " hv-chip--on" : ""}`} aria-pressed={on}
                onClick={() => setFilter((f) => (on ? f.filter((x) => x !== g) : [...f, g]))}>
                {label(g)} <small>{count[g]}</small>
              </button>
            );
          })}
        </div>
      )}
      {all.length > 0 && (
        <div className="hv-select">
          <span className="hc-dim">
            {picked.length
              ? t("homeVault.selected", { defaultValue: "{{n}} selected", n: picked.length })
              : t("homeVault.selectHint", { defaultValue: "Select items to tag them" })}
          </span>
          <button type="button" className="ov-btn ov-btn--ghost" onClick={() => setPicked([...new Set([...picked, ...shown.map((it) => it.sha256)])])}>
            {t("homeVault.selectShown", { defaultValue: "Select shown" })}
          </button>
          {picked.length > 0 && (
            <>
              <button type="button" className="ov-btn ov-btn--ghost" onClick={() => setPicked([])}>
                {t("homeVault.clear", { defaultValue: "Clear" })}
              </button>
              <select className="ov-input" value={tagTo || conf?.live || ""} onChange={(e) => setTagTo(e.target.value)}
                aria-label={t("homeVault.tag", { defaultValue: "Tag" })}>
                {choices.map((g) => (
                  <option key={g} value={g}>{label(g)}</option>
                ))}
              </select>
              <button type="button" className="ov-btn" disabled={busy || !choices.length} onClick={() => applyTag("add")}>
                {t("homeVault.addTag", { defaultValue: "Add tag" })}
              </button>
              <button type="button" className="ov-btn ov-btn--ghost" disabled={busy || !pickedItems.some((it) => it.tags.includes(tagTo || conf?.live))}
                onClick={() => applyTag("remove")}>
                {t("homeVault.removeTag", { defaultValue: "Remove tag" })}
              </button>
            </>
          )}
        </div>
      )}
      {all.length > 0 && !shown.length && <p className="ov-page-sub">{t("homeVault.noMatch", { defaultValue: "Nothing carries these tags." })}</p>}
      <div className="hv-grid">
        {shown.map((it) => (
          <div key={it.sha256} className={`hv-item${isPicked(it) ? " hv-item--picked" : ""}`}>
            <label className="hv-pick">
              <input type="checkbox" checked={isPicked(it)} onChange={() => toggle(it.sha256)}
                aria-label={t("homeVault.select", { defaultValue: "Select {{name}}", name: name(it) })} />
            </label>
            <button
              type="button"
              className="hv-open"
              onClick={() => {
                if (it.kind !== "photo") return open(it);
                const list = shown.filter((x) => x.kind === "photo");
                return setPreview({ list, i: list.indexOf(it) });
              }}
              title={it.kind === "photo" ? t("homeVault.view", { defaultValue: "View" }) : t("homeVault.download", { defaultValue: "Download" })}
            >
              <span className="hv-thumb">
                {it.thumbUrl || urls[it.sha256] ? <img src={it.thumbUrl || urls[it.sha256]} alt="" loading="lazy" /> : <span>{ICON[it.kind] || ICON.other}</span>}
              </span>
              <span className="hv-name">{name(it)}</span>
              <span className="hv-meta">
                {t(`homeVault.kind.${it.kind}`, { defaultValue: it.kind })} · {bytes(it.size)}
              </span>
            </button>
            {it.tags.length > 0 && (
              <span className="hv-tags">
                {[...it.tags].sort(order).map((g) => (
                  <span key={g} className={`hv-tag${g === conf?.live ? " hv-tag--live" : ""}`}>{shortId(home.homeId, g)}</span>
                ))}
              </span>
            )}
          </div>
        ))}
      </div>
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
