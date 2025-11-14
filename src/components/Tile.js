import * as React from "react";

const Tile = ({ tile }) => {
  const { title, description, icon, url, status } = tile;

  const isDisabled = status === "coming-soon" || status === "restricted";

  const handleClick = () => {
    if (!isDisabled && url && url !== "#") {
      window.location.href = url;
    }
  };

  return (
    <button
      className={`dhc-tile ${
        isDisabled ? "dhc-tile--disabled" : "dhc-tile--active"
      }`}
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
          <span className="dhc-badge dhc-badge-neutral">Coming soon</span>
        )}
        {status === "restricted" && (
          <span className="dhc-badge dhc-badge-locked">Restricted</span>
        )}
        {status === "available" && (
          <span className="dhc-badge dhc-badge-primary">Open</span>
        )}
      </div>
    </button>
  );
};

export default Tile;
