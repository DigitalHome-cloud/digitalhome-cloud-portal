import * as React from "react";
import Header from "./Header";

const Layout = ({ children }) => {
  return (
    <div className="dhc-root">
      <Header />
      <div className="dhc-content">{children}</div>
      <footer className="dhc-footer">
        <div className="dhc-footer-inner">
          <span>© {new Date().getFullYear()} D-LAB-5</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
