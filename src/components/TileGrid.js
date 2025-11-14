import * as React from "react";
import Tile from "./Tile";

const TileGrid = ({ tiles }) => {
  return (
    <div className="dhc-tile-grid">
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} />
      ))}
    </div>
  );
};

export default TileGrid;
