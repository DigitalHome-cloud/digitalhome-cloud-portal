import * as React from "react";
import { Link } from "gatsby";
import { useTranslation, useI18next } from "gatsby-plugin-react-i18next";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { t } = useTranslation();
  const { languages, language, changeLanguage } = useI18next();
  const { authState, isAuthenticated, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    // Let the AuthProvider re-evaluate state, UI will fall back to DEMO
  };

  return (
    <header className="dhc-header">
      <div className="dhc-header-inner">
        <div className="dhc-logo">
          <span className="dhc-logo-mark">DH</span>
          <div className="dhc-logo-text">
            <span className="dhc-logo-title">DigitalHome.Cloud</span>
            <span className="dhc-logo-subtitle">Portal</span>
          </div>
        </div>

        <nav className="dhc-nav">
          <div className="dhc-nav-group">
            <Link to="/" className="dhc-nav-link">
              {t("nav.home")}
            </Link>
            <Link to="/about" className="dhc-nav-link">
              {t("nav.about")}
            </Link>
            <a
              href="https://github.com/DigitalHome-cloud"
              target="_blank"
              rel="noreferrer"
              className="dhc-nav-link"
            >
              {t("nav.github")}
            </a>
         </div>

          <div className="dhc-nav-group dhc-nav-auth">
            {/* Auth status / actions */}
            {authState === "demo" && (
              <>
                <span className="dhc-nav-pill">DEMO</span>
                <Link to="/signin" className="dhc-nav-link">
                  {t("tile.signin.title")}
                </Link>
              </>
            )}

            {isAuthenticated && (
              <>
                <span className="dhc-nav-pill dhc-nav-pill--ok">
                  {user?.idTokenPayload?.name ||
                    user?.idTokenPayload?.email ||
                    user?.username ||
                    "Signed in"}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="dhc-nav-link dhc-nav-link-button"
                >
                  Sign out
                </button>
              </>
            )}

            {/* Language switcher */}
            <div className="dhc-lang-switch">
              {languages.map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => changeLanguage(lng)}
                  className={
                    language === lng
                      ? "dhc-lang-btn dhc-lang-btn--active"
                      : "dhc-lang-btn"
                  }
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
