import * as React from "react";
import { Link } from "gatsby";

const Header = () => {
  return (
    <header className="dhc-header">
      <div className="dhc-header-inner">
        <div className="dhc-logo">
          {/* Replace with an SVG later if you like */}
          <span className="dhc-logo-mark">DH</span>
          <div className="dhc-logo-text">
            <span className="dhc-logo-title">DigitalHome.Cloud</span>
            <span className="dhc-logo-subtitle">Portal</span>
          </div>
        </div>

        <nav className="dhc-nav">
          <Link to="/" className="dhc-nav-link">
            Home
          </Link>
          {/* placeholders for future pages */}
          <a
            href="https://github.com/DigitalHome-cloud"
            className="dhc-nav-link"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
