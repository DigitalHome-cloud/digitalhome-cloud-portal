import * as React from "react";
import { Link } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { getAppUrl } from "../utils/getAppUrl";

// The "continuous loop" hero: Observe → Design → Build → Run around a central
// habitat node. CTAs link to real destinations (those pages gate auth on their
// own, so a guest clicking through lands on sign-in).

const svg = (children, { w = 21, sw = 1.6 } = {}) => (
  <svg
    width={w}
    height={w}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const eye = svg(
  <>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const pen = svg(
  <>
    <path d="M5 19 12 5l7 14z" />
    <path d="M8.5 13h7" />
  </>
);
const cube = svg(
  <>
    <path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" />
    <path d="M12 12v9M4 7.5 12 12l8-4.5" />
  </>,
  { sw: 1.5 }
);
const gauge = svg(
  <>
    <path d="M4 15a8 8 0 0 1 16 0" />
    <path d="M12 15 16 10" />
    <circle cx="12" cy="15" r="1.3" />
  </>
);
const house = svg(
  <>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v9h12v-9" />
    <path d="M12 19v-4" />
  </>,
  { w: 34, sw: 1.4 }
);

const Cta = ({ accent, to, external, children }) => {
  const cls = `ov-card-btn ov-btn--${accent}`;
  return external ? (
    <a className={cls} href={to} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link className={cls} to={to}>
      {children}
    </Link>
  );
};

const Stage = ({ pos, accent, icon, title, desc, cta, active }) => (
  <div className={`ov-stage ov-stage--${pos}`}>
    <div className={"ov-card" + (active ? " ov-card--active" : "")}>
      <div className={`ov-card-icon ov-ic--${accent}`}>{icon}</div>
      <div className="ov-card-title">{title}</div>
      <div className="ov-card-desc">{desc}</div>
      {cta}
    </div>
  </div>
);

const arrow = "M -8 -7 L 3 0 L -8 7";

const OverviewLoop = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { activeHome } = useSmartHome();
  const homeId = activeHome?.id;
  const homeSet = isAuthenticated && homeId;
  const designerUrl = `${getAppUrl("designer")}?home=${encodeURIComponent(
    homeId || ""
  )}`;

  return (
    <div className="ov-body">
      <div className="ov-intro">
        <div className="ov-eyebrow">
          {t("overview.eyebrow", { defaultValue: "Welcome" })}
        </div>
        <h1 className="ov-title">
          {t("overview.title", {
            defaultValue: "Your habitat runs on one continuous loop.",
          })}
        </h1>
        <p className="ov-subtitle">
          {t("overview.subtitle", {
            defaultValue:
              "Observe your environment, design with purpose, build effortlessly, and run efficiently. Start where every great habitat begins: by understanding what is already there.",
          })}
        </p>
      </div>

      <div className="ov-loop">
        <svg
          className="ov-loop-svg"
          width="640"
          height="690"
          viewBox="0 0 640 690"
        >
          <circle
            className="ov-ring"
            cx="320"
            cy="340"
            r="220"
            fill="none"
            stroke="rgba(120,140,130,.28)"
            strokeWidth="1.5"
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
          <g
            stroke="#6fae7e"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity=".85"
          >
            <path d={arrow} transform="translate(476 184) rotate(45)" />
            <path d={arrow} transform="translate(476 496) rotate(135)" />
            <path d={arrow} transform="translate(164 496) rotate(225)" />
            <path d={arrow} transform="translate(164 184) rotate(315)" />
          </g>
        </svg>

        <div className="ov-center">
          <div className="ov-center-icon">{house}</div>
          <div className="ov-center-title">
            {homeSet
              ? homeId
              : t("overview.habitat", { defaultValue: "Your habitat" })}
          </div>
          <div className="ov-center-sub">
            {homeSet
              ? t("overview.activeHome", { defaultValue: "Active home" })
              : t("overview.notSetUp", { defaultValue: "Not set up yet" })}
          </div>
        </div>

        <Stage
          pos="observe"
          accent="observe"
          active
          icon={eye}
          title={t("overview.observe.title", { defaultValue: "Observe" })}
          desc={t("overview.observe.desc", {
            defaultValue:
              "Listen to your unique environment. Map the natural surroundings, the local climate, and the layout or physical structure of your existing building.",
          })}
          cta={
            <Cta accent="observe" to="/operator">
              {t("overview.observe.cta", { defaultValue: "Start Observing" })}
            </Cta>
          }
        />
        <Stage
          pos="design"
          accent="design"
          icon={pen}
          title={t("overview.design.title", { defaultValue: "Design" })}
          desc={t("overview.design.desc", {
            defaultValue:
              "Architect your efficiency blueprint. Balance RE2020 energy optimization targets with high standards for structural safety and human comfort.",
          })}
          cta={
            <Cta accent="design" to={designerUrl} external>
              {t("overview.design.cta", { defaultValue: "Model Your Space" })}
            </Cta>
          }
        />
        <Stage
          pos="build"
          accent="build"
          icon={cube}
          title={t("overview.build.title", { defaultValue: "Build" })}
          desc={t("overview.build.desc", {
            defaultValue:
              "Connect your physical elements. Match your sensors and HVAC hardware to your digital twin using a self-pairing edge gateway.",
          })}
          cta={
            <Cta accent="build" to="/link">
              {t("overview.build.cta", { defaultValue: "Pair Hardware" })}
            </Cta>
          }
        />
        <Stage
          pos="run"
          accent="run"
          icon={gauge}
          title={t("overview.run.title", { defaultValue: "Run" })}
          desc={t("overview.run.desc", {
            defaultValue:
              "Maintain effortless efficiency. Let quiet background automation gently tune your property to sustain RE2020 compliance and ideal indoor metrics.",
          })}
          cta={
            <Cta accent="run" to="/operator">
              {t("overview.run.cta", { defaultValue: "Launch Automation" })}
            </Cta>
          }
        />
      </div>

      <div className="ov-legend">
        <span>
          <span className="ov-dot" style={{ background: "#62b6c9" }} />
          {t("overview.observe.title", { defaultValue: "Observe" })}
        </span>
        <span className="ov-sep">→</span>
        <span>
          <span className="ov-dot" style={{ background: "#8a8fd6" }} />
          {t("overview.design.title", { defaultValue: "Design" })}
        </span>
        <span className="ov-sep">→</span>
        <span>
          <span className="ov-dot" style={{ background: "#c9954f" }} />
          {t("overview.build.title", { defaultValue: "Build" })}
        </span>
        <span className="ov-sep">→</span>
        <span>
          <span className="ov-dot" style={{ background: "#6fae7e" }} />
          {t("overview.run.title", { defaultValue: "Run" })}
        </span>
        <span className="ov-sep">↺</span>
      </div>
    </div>
  );
};

export default OverviewLoop;
