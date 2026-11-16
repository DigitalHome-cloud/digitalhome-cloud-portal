// Fetch the pre-aggregated "gold" weather/renewables JSON the pipeline writes to
// S3 public/weather/gold/. Read via Amplify Storage (public/* is guest+auth read).
import { getUrl } from "aws-amplify/storage";

const cache = {};

async function fetchGold(pathUnderGold) {
  const path = `public/weather/gold/${pathUnderGold}`;
  if (cache[path]) return cache[path];
  const { url } = await getUrl({ path });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`gold fetch failed (${res.status}) for ${path}`);
  const data = await res.json();
  cache[path] = data;
  return data;
}

export const fetchIndex = () => fetchGold("index.json");
// window ∈ {all, 10y, 5y, 3y, 1y}. Weather-derived blocks are windowed; water is not.
export const fetchAreaBlock = (areaId, kind, window = "all") =>
  fetchGold(`${areaId}/${window}/${kind}.json`);
export const fetchWater = (areaId) => fetchGold(`${areaId}/water.json`);
export const fetchLightning = (areaId) => fetchGold(`${areaId}/lightning.json`);
