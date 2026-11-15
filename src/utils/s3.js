/**
 * Per-device-file S3 helpers for the Portal's Device Inventory surface
 * (moved here from the Designer). This is the DEVICE slice only — the
 * Designer keeps its own s3.js for design/abox/toolbox artifacts.
 *
 * The catalogue is the marketplace (utils/market.js, ADR 0016); its files
 * are under public/market/<seller>/sha256/. Per-device files and the CSV inbox route
 * through the dhcDesignStorageProxy Lambda via requestDevice*Url mutations,
 * which resolve Private/ vs Public/ from DigitalHome.isDemo server-side.
 */
import { generateClient } from "aws-amplify/api";

async function fetchDeviceFileReadUrl(smartHomeId, deviceType, serialNumber, fileName) {
  const client = generateClient();
  const { requestDeviceFileReadUrl } = await import("../graphql/mutations");
  const result = await client.graphql({
    query: requestDeviceFileReadUrl,
    variables: { smartHomeId, deviceType, serialNumber, fileName },
  });
  return result.data.requestDeviceFileReadUrl.url;
}

async function fetchDeviceFileWriteUrl(
  smartHomeId,
  deviceType,
  serialNumber,
  fileName,
  contentType
) {
  const client = generateClient();
  const { requestDeviceFileWriteUrl } = await import("../graphql/mutations");
  const result = await client.graphql({
    query: requestDeviceFileWriteUrl,
    variables: { smartHomeId, deviceType, serialNumber, fileName, contentType },
  });
  return result.data.requestDeviceFileWriteUrl.url;
}

/** Read a per-device file (e.g. a spec JSON). Returns text, or null on 404. */
export async function readDeviceFile(smartHomeId, deviceType, serialNumber, fileName) {
  const url = await fetchDeviceFileReadUrl(
    smartHomeId,
    deviceType,
    serialNumber,
    fileName
  );
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`S3 GET device ${fileName} failed: ${res.status}`);
  }
  return res.text();
}

/** Write a per-device file via the signed-URL proxy. */
export async function writeDeviceFile(
  smartHomeId,
  deviceType,
  serialNumber,
  fileName,
  body,
  contentType = "application/octet-stream"
) {
  const url = await fetchDeviceFileWriteUrl(
    smartHomeId,
    deviceType,
    serialNumber,
    fileName,
    contentType
  );
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) {
    throw new Error(`S3 PUT device ${fileName} failed: ${res.status}`);
  }
}

// ─── CSV mass-import inbox (devices/inbox.json) ────────────────────────────

/** Read devices/inbox.json. Returns the parsed object, or null on 404. */
export async function readInbox(smartHomeId) {
  const client = generateClient();
  const { requestDeviceInboxReadUrl } = await import("../graphql/mutations");
  const result = await client.graphql({
    query: requestDeviceInboxReadUrl,
    variables: { smartHomeId },
  });
  const res = await fetch(result.data.requestDeviceInboxReadUrl.url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`S3 GET inbox.json failed: ${res.status}`);
  }
  return res.json();
}

/** Write devices/inbox.json (the full inbox object). */
export async function writeInbox(smartHomeId, obj) {
  const client = generateClient();
  const { requestDeviceInboxWriteUrl } = await import("../graphql/mutations");
  const contentType = "application/json";
  const result = await client.graphql({
    query: requestDeviceInboxWriteUrl,
    variables: { smartHomeId, contentType },
  });
  const res = await fetch(result.data.requestDeviceInboxWriteUrl.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(obj, null, 2),
  });
  if (!res.ok) {
    throw new Error(`S3 PUT inbox.json failed: ${res.status}`);
  }
}
