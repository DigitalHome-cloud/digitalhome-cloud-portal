// The site survey from a phone (darkfactory ADR 0018 point 10).
//
// Blank QR tags: a code printed before anyone knows which item it will stand
// for (/id/?t=<tagId>). On site the person binds it to an item of the home,
// or to an observation of something not in the design yet; it can be bound
// again later. The tag lives in the cloud; nothing is in the code.
//
// Survey photos and notes go to the home's vault through the same API as the
// edge's uploads, filed under the configuration the card was read from and
// tagged with what they show: survey, item:<id>, kind:<kind>, room:<name>.

import { generateClient } from "aws-amplify/api";

const client = generateClient();
const call = async (query, variables = {}) => (await client.graphql({ query, variables, authMode: "userPool" })).data;
const parse = (x) => (typeof x === "string" ? JSON.parse(x) : x);

export const TAG_ID = /^t-[abcdefghjkmnpqrstuvwxyz23456789]{10}$/;

// ── tags ─────────────────────────────────────────────────────────────────────

const HOME_TAG = /* GraphQL */ `
  query HomeTag($tagId: String!) { homeTag(tagId: $tagId) { tagId homeId item boundAt } }
`;
const BIND_TAG = /* GraphQL */ `
  mutation BindHomeTag($tagId: String!, $item: String) { bindHomeTag(tagId: $tagId, item: $item) { tagId homeId item boundAt } }
`;
export const homeTag = async (tagId) => (await call(HOME_TAG, { tagId })).homeTag;
export const bindTag = async (tagId, item) => (await call(BIND_TAG, { tagId, item: item || null })).bindHomeTag;

/** An observation: something seen on site that the design does not have yet. */
export const observationId = (tagId) => `obs-${String(tagId).replace(/^t-/, "")}`;
export const isObservation = (item) => /^obs-/.test(item || "");

// ── the vault ────────────────────────────────────────────────────────────────

const ITEMS = /* GraphQL */ `
  query HomeVaultItems($homeId: String!, $tag: String) {
    homeVaultItems(homeId: $homeId, tag: $tag) {
      items { sha256 kind name caption tags thumbUrl uploadedAt }
    }
  }
`;
const REQUEST = /* GraphQL */ `
  mutation RequestHomeVaultUpload($homeId: String!, $files: AWSJSON!) {
    requestHomeVaultUpload(homeId: $homeId, files: $files)
  }
`;
const COMMIT = /* GraphQL */ `
  mutation CommitHomeVaultItem($homeId: String!, $file: AWSJSON!) {
    commitHomeVaultItem(homeId: $homeId, file: $file) { status sha256 }
  }
`;
const TAG = /* GraphQL */ `
  mutation TagHomeVaultItems($homeId: String!, $sha256s: [String]!, $add: [String], $remove: [String]) {
    tagHomeVaultItems(homeId: $homeId, sha256s: $sha256s, add: $add, remove: $remove)
  }
`;

/** The vault items carrying a tag (item:<id>), newest first. */
export async function itemsTagged(homeId, tag) {
  const items = (await call(ITEMS, { homeId, tag })).homeVaultItems?.items || [];
  return items.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
}

/** The subject tags of an observation: never an address, ids and short words. */
export function subjectTags({ item, kind, room }) {
  const tags = ["survey"];
  if (item) tags.push(`item:${item}`);
  if (kind && /^[a-z_]{2,20}$/.test(kind)) tags.push(`kind:${kind}`);
  const r = String(room || "").replace(/[^\p{L}\p{N} ._'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (r) tags.push(`room:${r}`);
  return tags;
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A 320 px WebP thumbnail of a photo, or null if the browser cannot make one. */
async function thumbnail(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.8));
    return blob && blob.type === "image/webp" ? blob : null;
  } catch (e) {
    return null;
  }
}

const stamp = () => new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);

/**
 * Put one photo (or, without one, the note as a small Markdown file) into the
 * vault, filed under configVersion and tagged with what it shows.
 * Returns the item's sha256.
 */
export async function uploadObservation(homeId, { file, note, configVersion, tags }) {
  const caption = String(note || "").trim().slice(0, 500);
  let blob = file;
  let name = file ? `survey-${stamp()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}` : `survey-note-${stamp()}.md`;
  if (!blob) {
    if (!caption) throw new Error("a photo or a note");
    blob = new Blob([`${caption}\n`], { type: "text/markdown" });
  }
  const contentType = blob.type || (file ? "image/jpeg" : "text/markdown");
  const thumb = file ? await thumbnail(file) : null;
  const offer = {
    sha256: await sha256Hex(blob), size: blob.size, name, contentType,
    takenAt: new Date().toISOString(), caption: caption || undefined, configVersion: configVersion || undefined, thumb: !!thumb,
  };
  const answer = parse((await call(REQUEST, { homeId, files: JSON.stringify([offer]) })).requestHomeVaultUpload);
  const got = answer.files?.[0];
  if (!got) throw new Error("the vault did not answer");
  if (got.status === "too_large") throw new Error("this file is too large for the vault");
  if (got.status === "new") {
    const put = await fetch(got.url, { method: "PUT", headers: got.headers, body: blob });
    if (!put.ok) throw new Error(`the upload failed (${put.status})`);
    if (got.thumbUrl && thumb) await fetch(got.thumbUrl, { method: "PUT", headers: got.thumbHeaders, body: thumb }).catch(() => null);
    await call(COMMIT, { homeId, file: JSON.stringify(offer) });
  }
  if (tags && tags.length) await call(TAG, { homeId, sha256s: [offer.sha256], add: tags, remove: [] });
  return offer.sha256;
}
