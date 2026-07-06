import * as React from "react";
import { Link } from "gatsby";
import { useI18next } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { useTier } from "../utils/useTier";
import { getAppUrl } from "../utils/getAppUrl";

// Left-rail shell for the Overview landing. Self-contained (does NOT use the
// shared Layout/Header). Auth-aware: guest vs signed-in changes the Account
// group, the Manage locks, the footer chip, and the top-bar status pill.

const GITHUB_URL = "https://github.com/DigitalHome-cloud";

const S = (children, { w = 16, fill = false, sw = 1.6 } = {}) => (
  <svg
    width={w}
    height={w}
    viewBox="0 0 24 24"
    fill={fill ? "currentColor" : "none"}
    stroke={fill ? "none" : "currentColor"}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const IC = {
  home: S(
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  catalog: S(
    <>
      <path d="M12 4 3 9l9 5 9-5z" />
      <path d="M3 14l9 5 9-5" />
    </>
  ),
  leaf: S(<path d="M5 19c0-8 6-12 14-13 0 9-5 14-14 13z" />),
  designer: S(<path d="M5 19 12 5l7 14z" />),
  operator: S(
    <>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M12 15 16 10" />
    </>
  ),
  fleet: S(<path d="M12 4 5 7v5c0 4 3 7 7 8 4-1 7-4 7-8V7z" />),
  userPlus: S(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>,
    { sw: 1.8 }
  ),
  signIn: S(
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  signOut: S(
    <>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M14 17l5-5-5-5" />
      <path d="M19 12H7" />
    </>
  ),
  account: S(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
    { sw: 1.7 }
  ),
  plan: S(
    <>
      <path d="M4 12l8-8h5v5l-8 8z" />
      <circle cx="14.5" cy="9.5" r="1.3" />
    </>
  ),
  support: S(
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1.3-4.6A8 8 0 1 1 21 12z" />
  ),
  github: S(
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />,
    { fill: true }
  ),
  lock: S(
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
    { w: 12, sw: 2 }
  ),
};

const NavLink = ({
  icon,
  label,
  to,
  external,
  active,
  locked,
  variant,
  onClick,
}) => {
  const cls =
    "ov-link" +
    (active ? " ov-link--active" : "") +
    (locked ? " ov-link--locked" : "") +
    (variant ? ` ov-link--${variant}` : "");
  const body = (
    <>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {locked && <span className="ov-lock">{IC.lock}</span>}
    </>
  );
  if (locked) return <span className={cls}>{body}</span>;
  if (onClick)
    return (
      <button type="button" className={cls} onClick={onClick}>
        {body}
      </button>
    );
  if (external)
    return (
      <a className={cls} href={to} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  return (
    <Link className={cls} to={to}>
      {body}
    </Link>
  );
};

const OverviewShell = ({
  children,
  active = "overview",
  title = "Overview",
}) => {
  const { isAuthenticated, user, signOut } = useAuth();
  const { activeHome } = useSmartHome();
  const { tier } = useTier();
  const { language, languages, changeLanguage } = useI18next();

  const name =
    user?.idTokenPayload?.name ||
    user?.idTokenPayload?.email ||
    user?.username ||
    "You";
  const homeId = activeHome?.id;
  const designerUrl = `${getAppUrl("designer")}?home=${encodeURIComponent(
    homeId || ""
  )}`;

  const cycleLang = () => {
    const list = languages && languages.length ? languages : ["en"];
    const next = list[(list.indexOf(language) + 1) % list.length];
    changeLanguage(next);
  };

  return (
    <div className="ov">
      {/* ── rail ── */}
      <nav className="ov-rail">
        <div className="ov-brand">
          <span className="ov-brand-mark">{IC.home}</span>
          <span className="ov-brand-text">
            digitalhome<b>.cloud</b>
          </span>
        </div>

        <div className="ov-nav">
          <div className="ov-group">Explore</div>
          <NavLink
            icon={IC.home}
            label="Overview"
            to="/"
            active={active === "overview"}
          />
          <NavLink
            icon={IC.catalog}
            label="Catalog"
            to={getAppUrl("modeler")}
            external
          />
          <NavLink icon={IC.leaf} label="Area data" to="/operator" />

          <div className="ov-group">Manage</div>
          <NavLink
            icon={IC.designer}
            label="Designer"
            to={designerUrl}
            external={isAuthenticated}
            locked={!isAuthenticated}
          />
          <NavLink
            icon={IC.operator}
            label="Operator"
            to="/operator"
            locked={!isAuthenticated}
          />
          <NavLink
            icon={IC.fleet}
            label="Fleet"
            to="/fleet"
            active={active === "fleet"}
            locked={!isAuthenticated}
          />

          <div className="ov-group">Account</div>
          {isAuthenticated ? (
            <>
              <NavLink icon={IC.account} label="Account" to="/userprofile" />
              <NavLink icon={IC.signOut} label="Sign out" onClick={signOut} />
            </>
          ) : (
            <>
              <NavLink
                icon={IC.userPlus}
                label="Sign up"
                to="/signin"
                variant="primary"
              />
              <NavLink
                icon={IC.signIn}
                label="Sign in"
                to="/signin"
                variant="outline"
              />
            </>
          )}
          <NavLink icon={IC.plan} label="Plans" to="/about" />
          <NavLink
            icon={IC.support}
            label="Support"
            to={`${GITHUB_URL}/digitalhome-cloud-portal/issues`}
            external
          />
          <NavLink icon={IC.github} label="GitHub" to={GITHUB_URL} external />
        </div>

        <div className="ov-rail-foot">
          <span className="ov-avatar">{IC.account}</span>
          <div>
            <div className="ov-foot-name">
              {isAuthenticated ? name : "Guest"}
            </div>
            <div className="ov-foot-sub">
              {isAuthenticated ? tier || "signed in" : "Not signed in"}
            </div>
          </div>
        </div>
      </nav>

      {/* ── main ── */}
      <div className="ov-main">
        <div className="ov-topbar">
          <div className="ov-topbar-title">
            <b>{title}</b>
            <span className="ov-crumb">
              /{" "}
              {isAuthenticated
                ? homeId || "no home yet"
                : "guest · no home yet"}
            </span>
          </div>
          <div className="ov-topbar-right">
            <button
              type="button"
              className="ov-lang"
              onClick={cycleLang}
              aria-label="Change language"
            >
              {language}
            </button>
            <span
              className={
                "ov-status" + (isAuthenticated ? " ov-status--member" : "")
              }
            >
              <span className="ov-status-dot" />
              {isAuthenticated ? (tier || "member").toUpperCase() : "GUEST"}
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default OverviewShell;
