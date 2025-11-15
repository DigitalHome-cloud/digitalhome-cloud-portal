import * as React from "react";
import { Link } from "gatsby";
import { useTranslation, useI18next } from "gatsby-plugin-react-i18next";

const Header = () => {
  const { t } = useTranslation();
  const { languages, language, changeLanguage } = useI18next();

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
          <Link to="/" className="dhc-nav-link">
            {t("nav.home")}
          </Link>
          <Link to="/about" className="dhc-nav-link">
            {t("nav.about")}
          </Link>
          <a
            href="https://github.com/DigitalHome-cloud"
            className="dhc-nav-link"
            target="_blank"
            rel="noreferrer"
          >
            {t("nav.github")}
          </a>

          <div className="dhc-lang-switch">
            {languages.map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => changeLanguage(lng)}
                className={
                  lng === language
                    ? "dhc-lang-btn dhc-lang-btn--active"
                    : "dhc-lang-btn"
                }
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
