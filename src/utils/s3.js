/**
 * Device-catalogue + per-device-file S3 helpers for the Portal's Device
 * Inventory surface (moved here from the Designer). This is the DEVICE slice
 * only — the Designer keeps its own s3.js for design/abox/toolbox artifacts.
 *
 * Catalogue assets live under public/catalogue/devices/... (admin-write,
 * enforced by the storage rule). Per-device files and the CSV inbox route
 * through the dhcDesignStorageProxy Lambda via requestDevice*Url mutations,
 * which resolve Private/ vs Public/ from DigitalHome.isDemo server-side.
 */
import { uploadData, downloadData, getUrl } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/api";

const S3_PREFIX_CATALOGUE = "catalogue/devices";

/** `public/catalogue/devices/<deviceType>/<modelNumber>/<kind>/<fileName>` */
export function catalogueAssetPath(deviceType, modelNumber, kind, fileName) {
  return `public/${S3_PREFIX_CATALOGUE}/${deviceType}/${modelNumber}/${kind}/${fileName}`;
}

/** Read a catalogue asset (kind = "docs" | "img" | "specs"). Returns text or null. */
export async function fetchCatalogueAsset(deviceType, modelNumber, kind, fileName) {
  try {
    const result = await downloadData({
      path: catalogueAssetPath(deviceType, modelNumber, kind, fileName),
    }).result;
    return await result.body.text();
  } catch (err) {
    console.warn("[S3] catalogue asset missing:", err.message);
    return null;
  }
}

/**
 * Try to resolve a signed read URL for a catalogue cover image. Probes the
 * conventional filenames the upload pipeline writes and returns the first that
 * exists, or `null`.
 */
export async function fetchCatalogueImageUrl(deviceType, modelNumber) {
  if (!deviceType || !modelNumber) return null;
  const candidates = ["cover.png", "cover.jpg", "cover.jpeg", "cover.webp"];
  for (const name of candidates) {
    const path = catalogueAssetPath(deviceType, modelNumber, "img", name);
    try {
      const { url } = await getUrl({
        path,
        options: { validateObjectExistence: true, expiresIn: 900 },
      });
      return { url: url.toString(), path };
    } catch {
      // 404 → try next candidate
    }
  }
  return null;
}

/** Upload a catalogue asset. Requires dhc-admins (enforced by the storage rule). */
export async function uploadCatalogueAsset(
  deviceType,
  modelNumber,
  kind,
  fileName,
  data,
  contentType = "application/octet-stream"
) {
  await uploadData({
    path: catalogueAssetPath(deviceType, modelNumber, kind, fileName),
    data,
    options: { contentType },
  }).result;
}

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
