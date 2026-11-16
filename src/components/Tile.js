import * as React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { UpgradePrompt } from "./UpgradePrompt";

const TIER_LABELS = {
  guest: "Guest",
  welcome: "Welcome",
  standard: "Standard",
  professional: "Professional",
};

const Tile = ({ tile }) => {
  const { t } = useTranslation();
  const { title, description, icon, url, status, requiredTier, currentTier } = tile;
  const isDisabled = status === "coming-soon" || status === "restricted";

  const handleClick = () => {
    if (!isDisabled && url && url !== "#") {
      window.location.href = url;
    }
  };

  return (
    <button
      className={`dhc-tile ${isDisabled ? "dhc-tile--disabled" : "dhc-tile--active"}`}
      onClick={handleClick}
      type="button"
    >
      <div className="dhc-tile-icon">{icon}</div>
      <div className="dhc-tile-body">
        <h3 className="dhc-tile-title">{title}</h3>
        <p className="dhc-tile-description">{description}</p>
      </div>
      <div className="dhc-tile-footer">
        {status === "coming-soon" && (
          <span className="dhc-badge dhc-badge-neutral">
            {t("badge.comingSoon")}
          </span>
        )}
        {status === "restricted" && requiredTier && (
          <UpgradePrompt required={requiredTier} current={currentTier} compact />
        )}
        {status === "restricted" && !requiredTier && (
          <span className="dhc-badge dhc-badge-locked">
            {t("badge.restricted")}
          </span>
        )}
        {status === "available" && (
          <span className="dhc-badge dhc-badge-primary">
            {t("badge.open")}
          </span>
        )}
      </div>
    </button>
  );
};

export default Tile;
