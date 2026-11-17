import * as React from "react";
import { graphql, navigate, Link } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { configurations, graphText, shortId, smartHomeIdOf } from "../utils/homeConfig";
import { card, inventory, validHome, validItem } from "../utils/idCard";
import { TAG_ID, bindTag, homeTag, isObservation, itemUrl, itemsTagged, newTagFor, observationId, subjectTags, tagUrl, uploadObservation } from "../utils/survey";
import { nfcAvailable, qrSvg, scanTags, setSurveyMode, surveyModeOn, writeUrl } from "../utils/nfc";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "../styles/overview.css";

// The ID card of one item, opened from a QR label on the board, a socket, a
// switch or a device (/id/?h=<homeId>&i=<item>). Made for a phone: no rail,
// one column. Only the home's owners (and dhc-admins) can read the graph,
// so anyone else gets the sign-in page, then "not yours".
//
// A blank tag (/id/?t=<tagId>, ADR 0018 point 10) is bound on site to an
// item, or to an observation of something the design does not have yet, and
// can be bound again. Every card has a survey block: a photo from the camera
// and a note, filed in the home's vault under what they show.

const parseTtl = async (ttl) => {
  const { Parser } = await import("n3");
  return new Parser().parse(ttl || "");
};

const params = () => {
  if (typeof window === "undefined") return { h: "", i: "", t: "" };
  const q = new URLSearchParams(window.location.search);
  return { h: q.get("h") || "", i: q.get("i") || "", t: q.get("t") || "" };
};

/** What a blank tag can be bound to: the newest open option (the survey's), else the live version. */
async function itemsToBind(homeId) {
  const conf = await configurations(homeId);
  if (!conf) return { state: "none" };
  const open = (conf.options || []).filter((x) => x.status === "open");
  const from = open.length ? open[open.length - 1].id : conf.live;
  if (!from) return { state: "none" };
  return { state: "bind", items: inventory(await parseTtl(await graphText(homeId, from))), configVersion: from, short: shortId(homeId, from) };
}

/** Where the item is: the live version first, then the open options, then the legacy versions. */
async function lookup(homeId, item) {
  const conf = await configurations(homeId);
  if (!conf) return { state: "none" };
  const tries = [];
  if (conf.live) tries.push({ id: conf.live, where: "live" });
  for (const o of (conf.options || []).filter((x) => x.status === "open").reverse())
    tries.push({ id: o.id, where: "option", label: o.label });
  for (const v of (conf.versions || []).filter((x) => x.status !== "live").sort((a, b) => (a.version < b.version ? 1 : -1)))
    tries.push({ id: v.id, where: "legacy" });
  for (const t of tries) {
    const quads = await parseTtl(await graphText(homeId, t.id));
    const c = card(quads, item);
    if (c) {
      const v = (conf.versions || []).find((x) => x.id === t.id);
      const smartHomeId = await smartHomeIdOf(homeId).catch(() => "");
      return { state: "found", card: c, from: { ...t, short: shortId(homeId, t.id), at: v?.at || null }, live: conf.live, smartHomeId };
    }
  }
  return { state: "missing", live: conf.live };
}

const A = (v, unit) => (v === null || v === undefined ? `? ${unit}` : `${v} ${unit}`);

function Row({ k, children }) {
  return (
    <div className="idc-row">
      <span>{k}</span>
      <b>{children}</b>
    </div>
  );
}

function Breaker({ c, t }) {
  if (!c) return null;
  const p = c.breaker?.place;
  return (
    <section className="idc-box idc-off">
      <h2>{t("idCard.switchOff", { defaultValue: "To switch it off" })}</h2>
      <Row k={t("idCard.breaker", { defaultValue: "Breaker" })}>
        {c.label} · {A(c.rating, "A")}
      </Row>
      {p && (
        <Row k={t("idCard.where", { defaultValue: "Where" })}>
          {p.board}
          {p.modules ? ` · № ${p.modules}` : ` · ${t("idCard.noPlace", { defaultValue: "position not read" })}`}
        </Row>
      )}
      {c.phase && <Row k={t("idCard.phase", { defaultValue: "Phase" })}>{c.phase}</Row>}
      {c.rcd && (
        <Row k={t("idCard.rcd", { defaultValue: "RCD" })}>
          {c.rcd.label} · {A(c.rcd.sensitivity, "mA")}
          {c.rcd.type ? ` · ${c.rcd.type}` : ""}
          {c.rcd.place?.modules ? ` · № ${c.rcd.place.modules}` : ""}
        </Row>
      )}
      {!c.rcd && <p className="idc-warn">{t("idCard.noRcd", { defaultValue: "No RCD above this circuit." })}</p>}
    </section>
  );
}

const KINDS = ["socket", "switch", "light", "appliance", "outlet", "other"];

/** Photos and notes of one item, and a way to add one from the camera. */
function Survey({ homeId, item, configVersion, kind, room, t }) {
  const [list, setList] = React.useState(null);
  const [file, setFile] = React.useState(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const load = React.useCallback(() => {
    itemsTagged(homeId, `item:${item}`).then(setList, () => setList([]));
  }, [homeId, item]);
  React.useEffect(load, [load]);
  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await uploadObservation(homeId, { file, note, configVersion, tags: subjectTags({ item, kind, room }) });
      setFile(null);
      setNote("");
      setMsg(t("idCard.saved", { defaultValue: "Saved in the home's vault." }));
      load();
    } catch (e) {
      setMsg(String(e?.errors?.[0]?.message || e?.message || e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="idc-box">
      <h2>{t("idCard.survey", { defaultValue: "Survey" })}</h2>
      {list === null ? (
        <p className="idc-note">…</p>
      ) : list.length === 0 ? (
        <p className="idc-note">{t("idCard.noPhotos", { defaultValue: "No photo or note yet." })}</p>
      ) : (
        <div className="idc-photos">
          {list.map((x) => (
            <figure key={x.sha256}>
              {x.thumbUrl ? <img src={x.thumbUrl} alt="" /> : <span className="idc-doc">{x.kind === "document" ? "📝" : "📎"}</span>}
              {x.caption && <figcaption>{x.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      <label className="idc-camera">
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <span>{file ? `📷 ${file.name}` : t("idCard.addPhoto", { defaultValue: "📷 Take a photo" })}</span>
      </label>
      <textarea
        className="idc-input"
        rows={2}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("idCard.notePh", { defaultValue: "A note (dictation works): what you see, what to check" })}
      />
      <button type="button" className="idc-primary" disabled={busy || (!file && !note.trim())} onClick={save}>
        {busy ? t("idCard.saving", { defaultValue: "Saving…" }) : t("idCard.save", { defaultValue: "Save" })}
      </button>
      {msg && <p className="idc-note">{msg}</p>}
    </section>
  );
}

const errText = (e) => String(e?.errors?.[0]?.message || e?.message || e);

/**
 * This spot's link as a QR code or onto an NFC tag (both open the same page),
 * and a new tag for the item, printed or written. NFC writing needs Chrome
 * on Android; elsewhere the link is copied into a writer app.
 */
function TagTools({ url, homeId, item, t }) {
  const nfc = nfcAvailable();
  const [qr, setQr] = React.useState("");        // the SVG shown, for `shown`
  const [shown, setShown] = React.useState("");  // the link the QR or the NFC step is for
  const [step, setStep] = React.useState("");    // "" | "confirm" | "writing"
  const [lock, setLock] = React.useState(true);
  const [msg, setMsg] = React.useState("");
  const showQr = async (u) => {
    setMsg("");
    setShown(u);
    setQr(await qrSvg(u));
  };
  const write = async () => {
    setStep("writing");
    setMsg(t("idCard.nfcHold", { defaultValue: "Hold the phone to the tag…" }));
    try {
      await writeUrl(shown || url, { lock });
      setMsg(lock ? t("idCard.nfcLocked", { defaultValue: "Written and locked." }) : t("idCard.nfcWritten", { defaultValue: "Written (not locked)." }));
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setStep("");
    }
  };
  const copy = async (u) => {
    try {
      await navigator.clipboard.writeText(u);
      setMsg(t("idCard.copied", { defaultValue: "Link copied: paste it into an NFC writer app, then lock the tag." }));
    } catch (e) {
      setMsg(u);
    }
  };
  const newTag = async (media) => {
    setMsg("");
    try {
      const u = tagUrl(await newTagFor(homeId, item));
      if (media === "qr") await showQr(u);
      else {
        setShown(u);
        setQr("");
        setStep("confirm");
      }
    } catch (e) {
      setMsg(errText(e));
    }
  };
  return (
    <section className="idc-box">
      <h2>{t("idCard.tagTitle", { defaultValue: "QR and NFC" })}</h2>
      <div className="idc-row2">
        <button type="button" className="idc-ghost" onClick={() => (qr && shown === url ? setQr("") : showQr(url))}>
          {t("idCard.showQr", { defaultValue: "Show QR" })}
        </button>
        {nfc ? (
          <button type="button" className="idc-ghost" onClick={() => { setShown(url); setQr(""); setStep("confirm"); }}>
            {t("idCard.writeNfc", { defaultValue: "Write NFC tag" })}
          </button>
        ) : (
          <button type="button" className="idc-ghost" onClick={() => copy(url)}>
            {t("idCard.copyLink", { defaultValue: "Copy link" })}
          </button>
        )}
      </div>
      {item && homeId && (
        <div className="idc-row2">
          <button type="button" className="idc-ghost" onClick={() => newTag("qr")}>
            {t("idCard.newQr", { defaultValue: "New QR tag here" })}
          </button>
          {nfc && (
            <button type="button" className="idc-ghost" onClick={() => newTag("nfc")}>
              {t("idCard.newNfc", { defaultValue: "New NFC tag here" })}
            </button>
          )}
        </div>
      )}
      {qr && (
        <figure className="idc-qr">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          <figcaption>{shown.replace(/^https?:\/\//, "")}</figcaption>
        </figure>
      )}
      {step === "confirm" && (
        <div className="idc-confirm">
          <label className="idc-check">
            <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />{" "}
            {t("idCard.nfcLock", { defaultValue: "Lock the tag afterwards (cannot be undone; recommended)" })}
          </label>
          <button type="button" className="idc-primary" onClick={write}>
            {t("idCard.nfcGo", { defaultValue: "Write now" })}
          </button>
        </div>
      )}
      {!nfc && <p className="idc-note">{t("idCard.nfcHint", { defaultValue: "Any NFC phone opens a tag. Writing one from this page needs Chrome on Android; elsewhere use a writer app." })}</p>}
      {msg && <p className="idc-note">{msg}</p>}
    </section>
  );
}

/** Survey mode: the page keeps reading NFC tags and opens each one it is held to. */
function SurveyMode({ t }) {
  const [on, setOn] = React.useState(false);
  const [err, setErr] = React.useState("");
  React.useEffect(() => setOn(surveyModeOn()), []);
  React.useEffect(() => {
    if (!on) return undefined;
    let stop = null;
    let gone = false;
    scanTags((u) => window.location.assign(u.href)).then((s) => (gone ? s() : (stop = s)), (e) => { setErr(errText(e)); setOn(false); setSurveyMode(false); });
    return () => {
      gone = true;
      if (stop) stop();
    };
  }, [on]);
  if (!nfcAvailable()) return null;
  return (
    <label className="idc-check idc-mode">
      <input type="checkbox" checked={on} onChange={(e) => { setErr(""); setSurveyMode(e.target.checked); setOn(e.target.checked); }} />{" "}
      {t("idCard.surveyMode", { defaultValue: "Survey mode: hold the phone to the next NFC tag" })}
      {err && <small className="idc-warn"> {err}</small>}
    </label>
  );
}

/** A blank tag: pick what it is stuck on, or note something the design does not have. */
function BindScreen({ tagId, data, onBound, t, kindName }) {
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [newKind, setNewKind] = React.useState("socket");
  const [newRoom, setNewRoom] = React.useState("");
  const bind = async (item, extra = {}) => {
    setBusy(true);
    setErr("");
    try {
      await bindTag(tagId, item);
      onBound(item, extra);
    } catch (e) {
      setErr(String(e?.errors?.[0]?.message || e?.message || e));
      setBusy(false);
    }
  };
  const want = q.trim().toLowerCase();
  const shown = data.items.filter((x) => !want || `${x.label} ${x.room} ${x.sub}`.toLowerCase().includes(want));
  return (
    <>
      <section className="idc-box idc-top">
        <small>{t("idCard.blankTag", { defaultValue: "Blank tag" })}</small>
        <h1>{t("idCard.bindTitle", { defaultValue: "What is this tag on?" })}</h1>
        <p className="idc-note">
          {t("idCard.bindHint", { defaultValue: "From {{v}}. You can bind it again later.", v: data.short })}
        </p>
        <SurveyMode t={t} />
        <input className="idc-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("idCard.search", { defaultValue: "Search: room, label, board №" })} />
      </section>
      <section className="idc-box">
        <h2>{t("idCard.notInDesign", { defaultValue: "Not in the design yet" })}</h2>
        <div className="idc-row2">
          <select className="idc-input" value={newKind} onChange={(e) => setNewKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kindName("point", k)}
              </option>
            ))}
          </select>
          <input className="idc-input" value={newRoom} maxLength={40} onChange={(e) => setNewRoom(e.target.value)} placeholder={t("idCard.room", { defaultValue: "Room" })} />
        </div>
        <button type="button" className="idc-primary" disabled={busy} onClick={() => bind(observationId(tagId), { kind: newKind, room: newRoom })}>
          {t("idCard.observe", { defaultValue: "Bind as a new observation" })}
        </button>
      </section>
      <section className="idc-box">
        <h2>{t("idCard.inDesign", { defaultValue: "In the design" })}</h2>
        <ul className="idc-pick">
          {shown.map((x) => (
            <li key={x.id}>
              <button type="button" disabled={busy} onClick={() => bind(x.id, { kind: x.pointKind || x.kind, room: x.room })}>
                <b>{x.label}</b>
                <span>
                  {kindName(x.kind, x.pointKind)}
                  {x.room ? ` · ${x.room}` : ""}
                  {x.sub ? ` · ${x.sub}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {err && <p className="idc-warn">{err}</p>}
    </>
  );
}

const IdCardPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { smartHomes, setActiveHome } = useSmartHome();
  const [{ h, i, t: tagId }] = React.useState(params);
  const [res, setRes] = React.useState({ state: "loading" });
  const [round, setRound] = React.useState(0);   // bump to read again (after binding)
  const [hint, setHint] = React.useState({});    // kind and room picked when binding

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const back = tagId ? `/id/?t=${tagId}` : `/id/?h=${h}&i=${i}`;
      navigate(`/signin?redirect=${encodeURIComponent(back)}`);
      return;
    }
    let gone = false;
    const fail = (e) => {
      const m = String(e?.errors?.[0]?.message || e?.message || e);
      if (gone) return;
      if (/not authori[sz]ed|unauthori[sz]ed/i.test(m)) setRes({ state: "denied" });
      else if (/no such tag/i.test(m)) setRes({ state: "bad" });
      else setRes({ state: "error", error: m });
    };
    const run = async () => {
      if (tagId) {
        if (!TAG_ID.test(tagId)) return { state: "bad" };
        const tag = await homeTag(tagId);
        if (!tag) return { state: "bad" };
        if (!tag.item) return { ...(await itemsToBind(tag.homeId)), homeId: tag.homeId, tag };
        if (isObservation(tag.item)) {
          const conf = await configurations(tag.homeId);
          const open = (conf?.options || []).filter((x) => x.status === "open");
          return { state: "observation", homeId: tag.homeId, tag, configVersion: open.length ? open[open.length - 1].id : conf?.live || "" };
        }
        return { ...(await lookup(tag.homeId, tag.item)), homeId: tag.homeId, tag };
      }
      if (!validHome(h) || !validItem(i)) return { state: "bad" };
      return { ...(await lookup(h, i)), homeId: h };
    };
    setRes({ state: "loading" });
    run().then((r) => !gone && setRes(r), fail);
    return () => {
      gone = true;
    };
  }, [isLoading, isAuthenticated, h, i, tagId, round]);

  const rebind = () => {
    setHint({});
    setRes({ state: "loading" });
    bindTag(tagId, null).then(() => setRound((n) => n + 1), (e) => setRes({ state: "error", error: String(e?.errors?.[0]?.message || e?.message || e) }));
  };

  const home = res.smartHomeId ? (smartHomes || []).find((x) => x.id === res.smartHomeId) : null;
  const open = (path) => {
    if (home && setActiveHome) setActiveHome(home.id);
    navigate(path);
  };
  const c = res.card;
  const kindName = (k, pk) =>
    t(`idCard.kind.${pk || k}`, { defaultValue: { point: "Point", socket: "Socket", light: "Light", switch: "Switch", appliance: "Appliance", outlet: "Outlet", other: "Other", circuit: "Circuit", rcd: "RCD", device: "Device", board: "Board" }[pk || k] || k });

  return (
    <div className="ov idc">
      <header className="idc-head">
        <Link to="/" className="idc-brand">
          digitalhome<span>.cloud</span>
        </Link>
        <span className="idc-tag">{t("idCard.title", { defaultValue: "ID card" })}</span>
      </header>
      <main className="idc-main">
        {res.state === "loading" && <p className="idc-note">{t("idCard.loading", { defaultValue: "Reading the home's configuration…" })}</p>}
        {res.state === "bad" && <p className="idc-warn">{t("idCard.bad", { defaultValue: "This code is not a DigitalHome.Cloud label." })}</p>}
        {res.state === "denied" && (
          <p className="idc-warn">{t("idCard.denied", { defaultValue: "This label belongs to a home you are not an owner of. Only its owners see its card." })}</p>
        )}
        {res.state === "error" && <p className="idc-warn">{res.error}</p>}
        {res.state === "none" && <p className="idc-note">{t("idCard.none", { defaultValue: "This home has no configuration in the cloud yet." })}</p>}
        {res.state === "missing" && (
          <p className="idc-note">
            {t("idCard.missing", {
              defaultValue: "This item is not in the cloud yet: the label is newer than what was published. Push or publish the workspace on the pro edge.",
            })}
          </p>
        )}
        {res.state === "bind" && (
          <BindScreen
            tagId={tagId}
            data={res}
            t={t}
            kindName={kindName}
            onBound={(_, extra) => {
              setHint(extra);
              setRound((n) => n + 1);
            }}
          />
        )}
        {res.state === "observation" && (
          <>
            <section className="idc-box idc-top">
              <small>{t("idCard.observation", { defaultValue: "Observation" })}</small>
              <h1>{t("idCard.notInDesign", { defaultValue: "Not in the design yet" })}</h1>
              <p className="idc-note">
                {t("idCard.obsHint", { defaultValue: "Photos and notes go to the vault; the pro edge's chat proposes the design change, and you confirm it there." })}
              </p>
            </section>
            <Survey homeId={res.homeId} item={res.tag.item} configVersion={res.configVersion} kind={hint.kind} room={hint.room} t={t} />
            <TagTools url={tagUrl(tagId)} t={t} />
            <SurveyMode t={t} />
            <button type="button" className="idc-ghost" onClick={rebind}>
              {t("idCard.rebind", { defaultValue: "This tag is on something else: bind it again" })}
            </button>
          </>
        )}
        {res.state === "found" && c && (
          <>
            <section className="idc-box idc-top">
              <small>{kindName(c.kind, c.pointKind)}</small>
              <h1>{c.labelText || c.label}</h1>
              {c.labelText && c.labelText !== c.label && <p className="idc-note">{c.label}</p>}
              {c.room && <p className="idc-room">{c.room}</p>}
              {(c.toVerify || c.circuit?.toVerify) && (
                <p className="idc-warn">{t("idCard.toVerify", { defaultValue: "Marked to verify on site: some values were not read." })}</p>
              )}
              {res.from.where === "option" && (
                <p className="idc-warn">{t("idCard.planned", { defaultValue: "Planned, not built yet: in option {{o}}.", o: `${res.from.short} ${res.from.label || ""}` })}</p>
              )}
              {res.from.where === "legacy" && (
                <p className="idc-warn">{t("idCard.legacy", { defaultValue: "No longer in the live configuration: last in {{v}}.", v: res.from.short })}</p>
              )}
            </section>

            {c.kind === "point" && <Breaker c={c.circuit} t={t} />}
            {c.kind === "circuit" && (
              <>
                <Breaker c={c.circuit} t={t} />
                <section className="idc-box">
                  <h2>{t("idCard.circuit", { defaultValue: "Circuit" })}</h2>
                  <Row k={t("idCard.section", { defaultValue: "Cable" })}>{A(c.circuit.section, "mm²")}</Row>
                  <Row k={t("idCard.phases", { defaultValue: "Phases" })}>
                    {c.circuit.threePhase ? t("idCard.three", { defaultValue: "three-phase" }) : t("idCard.single", { defaultValue: "single-phase" })}
                  </Row>
                  {c.points.length > 0 && (
                    <ul className="idc-list">
                      {c.points.map((p) => (
                        <li key={p.id}>
                          {kindName("point", p.pointKind)}: {p.label}
                          {p.room ? ` · ${p.room}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
            {c.kind === "rcd" && (
              <section className="idc-box">
                <Row k={t("idCard.sensitivity", { defaultValue: "Sensitivity" })}>
                  {A(c.rcd.sensitivity, "mA")} {c.rcd.type ? `· ${c.rcd.type}` : ""}
                </Row>
                <Row k={t("idCard.rating", { defaultValue: "Rating" })}>{A(c.rcd.rating, "A")}</Row>
                {c.rcd.place && <Row k={t("idCard.where", { defaultValue: "Where" })}>{c.rcd.place.board}{c.rcd.place.modules ? ` · № ${c.rcd.place.modules}` : ""}</Row>}
                <ul className="idc-list">
                  {c.circuits.map((x) => (
                    <li key={x.id}>
                      {x.label} · {A(x.rating, "A")}
                      {x.breaker?.place?.modules ? ` · № ${x.breaker.place.modules}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {c.kind === "device" && (
              <section className="idc-box">
                {c.rating !== null && <Row k={t("idCard.rating", { defaultValue: "Rating" })}>{A(c.rating, "A")}</Row>}
                {c.place && <Row k={t("idCard.where", { defaultValue: "Where" })}>{c.place.board}{c.place.modules ? ` · № ${c.place.modules}` : ""}</Row>}
                {c.phase && <Row k={t("idCard.phase", { defaultValue: "Phase" })}>{c.phase}</Row>}
              </section>
            )}
            {c.reference && <p className="idc-note">{t("idCard.article", { defaultValue: "Article" })}: {c.reference}</p>}

            <Survey
              homeId={res.homeId}
              item={c.id}
              configVersion={res.from.id}
              kind={c.kind === "point" ? c.pointKind : c.kind}
              room={c.room || hint.room}
              t={t}
            />
            {tagId && (
              <button type="button" className="idc-ghost" onClick={rebind}>
                {t("idCard.rebind", { defaultValue: "This tag is on something else: bind it again" })}
              </button>
            )}
            <TagTools url={tagId ? tagUrl(tagId) : itemUrl(res.homeId, c.id)} homeId={res.homeId} item={c.id} t={t} />
            <SurveyMode t={t} />

            <p className="idc-safety">
              {t("idCard.safety", {
                defaultValue: "Before working: switch off, secure against switching back on, and verify there is no voltage. A label can be wrong or out of date.",
              })}
            </p>
            <footer className="idc-foot">
              <span>
                {res.smartHomeId || res.homeId} · {res.from.short}
                {res.from.at ? ` · ${new Date(res.from.at).toLocaleDateString()}` : ""}
              </span>
              <span className="idc-links">
                <button type="button" onClick={() => open("/configurations/")}>
                  {t("idCard.configurations", { defaultValue: "Configurations" })}
                </button>
                <button type="button" onClick={() => open("/vault/")}>
                  {t("idCard.vault", { defaultValue: "Photos" })}
                </button>
              </span>
            </footer>
          </>
        )}
        <p className="idc-fine">
          {t("idCard.check", {
            defaultValue: "A card is always on {{host}} and never asks for more than the usual sign-in.",
            host: typeof window === "undefined" ? "digitalhome.cloud" : window.location.host,
          })}
        </p>
      </main>
    </div>
  );
};

export default IdCardPage;

export const Head = () => (
  <>
    <title>ID card · DigitalHome.Cloud</title>
    <meta name="robots" content="noindex" />
  </>
);

export const query = graphql`
  query IdCardQuery($language: String!) {
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
