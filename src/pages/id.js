import * as React from "react";
import { graphql, navigate, Link } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { configurations, graphText, shortId, smartHomeIdOf } from "../utils/homeConfig";
import { card, validHome, validItem } from "../utils/idCard";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "../styles/overview.css";

// The ID card of one item, opened from a QR label on the board, a socket, a
// switch or a device (/id/?h=<homeId>&i=<item>). Made for a phone: no rail,
// one column. Only the home's owners (and dhc-admins) can read the graph,
// so anyone else gets the sign-in page, then "not yours".

const parseTtl = async (ttl) => {
  const { Parser } = await import("n3");
  return new Parser().parse(ttl || "");
};

const params = () => {
  if (typeof window === "undefined") return { h: "", i: "" };
  const q = new URLSearchParams(window.location.search);
  return { h: q.get("h") || "", i: q.get("i") || "" };
};

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

const IdCardPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { smartHomes, setActiveHome } = useSmartHome();
  const [{ h, i }] = React.useState(params);
  const [res, setRes] = React.useState({ state: "loading" });

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate(`/signin?redirect=${encodeURIComponent(`/id/?h=${h}&i=${i}`)}`);
      return;
    }
    if (!validHome(h) || !validItem(i)) {
      setRes({ state: "bad" });
      return;
    }
    let gone = false;
    lookup(h, i)
      .then((r) => !gone && setRes(r))
      .catch((e) => !gone && setRes({ state: /not authori[sz]ed|unauthori[sz]ed/i.test(String(e?.errors?.[0]?.message || e?.message || e)) ? "denied" : "error", error: String(e?.errors?.[0]?.message || e?.message || e) }));
    return () => {
      gone = true;
    };
  }, [isLoading, isAuthenticated, h, i]);

  const home = res.smartHomeId ? (smartHomes || []).find((x) => x.id === res.smartHomeId) : null;
  const open = (path) => {
    if (home && setActiveHome) setActiveHome(home.id);
    navigate(path);
  };
  const c = res.card;
  const kindName = (k, pk) =>
    t(`idCard.kind.${pk || k}`, { defaultValue: { point: "Point", socket: "Socket", light: "Light", switch: "Switch", appliance: "Appliance", outlet: "Outlet", circuit: "Circuit", rcd: "RCD", device: "Device", board: "Board" }[pk || k] || k });

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

            <p className="idc-safety">
              {t("idCard.safety", {
                defaultValue: "Before working: switch off, secure against switching back on, and verify there is no voltage. A label can be wrong or out of date.",
              })}
            </p>
            <footer className="idc-foot">
              <span>
                {res.smartHomeId || h} · {res.from.short}
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
