/**
 * The digitalhome.cloud marketplace, for the Portal.
 *
 * The device catalogue is one graph per seller (a manufacturer, distributor,
 * wholesaler, or `digitalhome-cloud`, the platform's curated catalogue),
 * kept by the core backend's `market` Lambda. The Portal reads and edits it as
 * JSON articles; an edit sends the article as it was read and as it should be,
 * and the Lambda merges that difference into the current catalogue, so a
 * change someone made meanwhile to another fact survives (and two values for
 * one fact come back as a conflict).
 *
 * The inventory components were written for the old DeviceModel rows, so
 * articles are handed to them in that shape (modelNumber, description,
 * has*Capability, thumbnail …), plus `seller` and `article` (its IRI).
 *
 * GraphQL strings are written here rather than generated, so this does not
 * need a codegen run of the whole schema.
 */
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";

export const PLATFORM_SELLER = "digitalhome-cloud";
const ID_BASE = "https://digitalhome.cloud/id/market/";

const SELLER_FIELDS = "id name kind version articles updatedAt mayEdit";
const Q = {
  listSellers: `query ListSellers { listSellers { ${SELLER_FIELDS} } }`,
  marketArticles: `query MarketArticles($seller: String, $query: String, $limit: Int) {
    marketArticles(seller: $seller, query: $query, limit: $limit) }`,
  editMarketArticle: `mutation EditMarketArticle($seller: String!, $reference: String!, $before: AWSJSON, $after: AWSJSON) {
    editMarketArticle(seller: $seller, reference: $reference, before: $before, after: $after) }`,
  marketUploads: `mutation MarketUploads($seller: String!, $files: AWSJSON!) { marketUploads(seller: $seller, files: $files) }`,
  createSeller: `mutation CreateSeller($id: String!, $name: String!, $kind: String!) {
    createSeller(id: $id, name: $name, kind: $kind) { ${SELLER_FIELDS} } }`,
  sellerEditors: `query SellerEditors($seller: String!) { sellerEditors(seller: $seller) }`,
  addSellerEditor: `mutation AddSellerEditor($seller: String!, $email: String!) { addSellerEditor(seller: $seller, email: $email) }`,
  removeSellerEditor: `mutation RemoveSellerEditor($seller: String!, $email: String!) {
    removeSellerEditor(seller: $seller, email: $email) }`,
  importDeviceCatalogue: `mutation ImportDeviceCatalogue { importDeviceCatalogue }`,
};

const gql = async (query, variables) => (await generateClient().graphql({ query, variables })).data;
const fromJson = (v) => (typeof v === "string" ? JSON.parse(v) : v);

/** As Python's urllib.parse.quote(ref, safe=""): the same IRI as on the edges. */
export const encodeRef = (ref) =>
  encodeURIComponent(String(ref).trim()).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
export const articleIri = (seller, reference) => `${ID_BASE}${seller}/${encodeRef(reference)}`;

export const filePath = (seller, name) => `public/market/${seller}/sha256/${name}`;
export async function fileUrl(seller, name) {
  return (await getUrl({ path: filePath(seller, name) })).url.toString();
}

// ------------------------------------------------------------ the shape ----

const CAPS = {
  hasActorCapability: "actor",
  hasSensorCapability: "sensor",
  hasControllerCapability: "controller",
  hasIOTCapability: "iot",
};

/** A marketplace article in the old DeviceModel shape the inventory views use. */
export async function articleToModel(a) {
  const images = a.image || [];
  let thumbnail = null;
  if (images.length) {
    try {
      thumbnail = await fileUrl(a.seller, images[0]);
    } catch {
      thumbnail = null;
    }
  }
  const m = {
    seller: a.seller,
    article: articleIri(a.seller, a.reference),
    modelNumber: a.reference,
    brand: a.brand || "",
    deviceType: a.deviceType || "",
    category: a.category || null,
    description: a.label || null,
    region: (a.usableIn || []).join(","),
    standards: a.conformsTo || [],
    compatibleClasses: a.compatibleClass || [],
    powerSource: a.powerSource || null,
    voltageV: a.voltageV ?? null,
    currentA: a.currentA ?? null,
    powerW: a.powerW ?? null,
    images,
    datasheets: a.datasheet || [],
    thumbnail,
    _article: a,
  };
  for (const [flag, cap] of Object.entries(CAPS)) m[flag] = (a.capability || []).includes(cap);
  return m;
}

const clean = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))
  );

/**
 * A model form's values as an article. Facts the form does not show
 * (approvedFor, ean, etimClass, images, datasheets) are taken from `base`.
 */
export function modelToArticle(m, base = {}) {
  const { seller, ...keep } = base || {};
  return clean({
    ...keep,
    reference: String(m.modelNumber || "").trim(),
    label: m.description ? String(m.description).trim() : null,
    brand: m.brand ? String(m.brand).trim() : null,
    deviceType: m.deviceType || null,
    category: m.category || null,
    powerSource: m.powerSource || null,
    voltageV: m.voltageV ?? null,
    currentA: m.currentA ?? null,
    powerW: m.powerW ?? null,
    capability: Object.entries(CAPS).filter(([flag]) => m[flag]).map(([, cap]) => cap),
    usableIn: String(m.region || "")
      .split(/[,;\s]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
    conformsTo: m.standards || [],
    compatibleClass: m.compatibleClasses || [],
  });
}

// ------------------------------------------------------------- reading ----

export async function listSellers() {
  return (await gql(Q.listSellers)).listSellers || [];
}

/** Articles in the DeviceModel shape: every seller's, or one seller's. */
export async function loadModels({ seller = null, query = null } = {}) {
  const got = fromJson((await gql(Q.marketArticles, { seller, query, limit: 2000 })).marketArticles) || {};
  const models = await Promise.all((got.articles || []).map(articleToModel));
  return { models, versions: got.versions || {}, more: !!got.more };
}

// ------------------------------------------------------------- writing ----

class MarketError extends Error {
  constructor(message, result) {
    super(message);
    this.result = result;
  }
}

async function edit(seller, reference, before, after) {
  const r = fromJson(
    (
      await gql(Q.editMarketArticle, {
        seller,
        reference,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      })
    ).editMarketArticle
  );
  if (r.status === "conflict") {
    const what = (r.conflicts || [])
      .map((c) => `${c.property}: yours ${c.mine.join(", ") || "—"}, now ${c.theirs.join(", ")}`)
      .join("; ");
    throw new MarketError(
      r.message || `Someone changed the same fact meanwhile (${what}). Reload and apply your change again.`,
      r
    );
  }
  if (r.status === "invalid") throw new MarketError(`The marketplace refused it: ${(r.problems || []).join("; ")}`, r);
  return r;
}

async function sha256Hex(file) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/**
 * Upload images / datasheets by content; returns their names (<sha256>.<ext>).
 * Each PUT is bound to the file's SHA-256, and a file the seller already has is
 * not sent again.
 */
export async function uploadFiles(seller, files) {
  const list = [];
  for (const f of files) {
    const ext = EXT[f.type] || String(f.name.split(".").pop() || "").toLowerCase().replace("jpeg", "jpg");
    if (!["jpg", "png", "webp", "pdf"].includes(ext)) {
      throw new MarketError(`${f.name}: images (jpg, png, webp) and datasheets (pdf) only`);
    }
    list.push({ file: f, sha256: await sha256Hex(f), ext, size: f.size });
  }
  if (!list.length) return [];
  const grants = fromJson(
    (
      await gql(Q.marketUploads, {
        seller,
        files: JSON.stringify(list.map(({ sha256, ext, size }) => ({ sha256, ext, size }))),
      })
    ).marketUploads
  );
  await Promise.all(
    grants.map(async (g, i) => {
      if (g.exists) return;
      const res = await fetch(g.url, { method: "PUT", headers: g.headers, body: list[i].file });
      if (!res.ok) throw new MarketError(`upload of ${list[i].file.name} failed (${res.status})`);
    })
  );
  return grants.map((g) => g.name);
}

/**
 * Save a model form's values as an article of `seller`. `previous` is the
 * model as it was read (null for a new one); new image/datasheet Files are
 * uploaded first and named on the article.
 */
export async function saveModel(seller, previous, values, { image = null, docs = [] } = {}) {
  const before = previous ? previous._article && stripSeller(previous._article) : null;
  const after = modelToArticle(values, before || {});
  if (image) {
    const [name] = await uploadFiles(seller, [image]);
    after.image = [name, ...(after.image || []).filter((x) => x !== name)].slice(0, 10);
  }
  if (docs.length) {
    const names = await uploadFiles(seller, docs);
    after.datasheet = [...new Set([...(after.datasheet || []), ...names])].slice(0, 10);
  }
  return edit(seller, after.reference, before, after);
}

export async function removeModel(m) {
  return edit(m.seller, m.modelNumber, stripSeller(m._article), null);
}

function stripSeller(a) {
  if (!a) return a;
  const { seller, ...rest } = a;
  return rest;
}

// ------------------------------------------------------------- sellers ----

export const createSeller = async (id, name, kind) => (await gql(Q.createSeller, { id, name, kind })).createSeller;
export const sellerEditors = async (seller) => (await gql(Q.sellerEditors, { seller })).sellerEditors || [];
export const addSellerEditor = (seller, email) => gql(Q.addSellerEditor, { seller, email });
export const removeSellerEditor = (seller, email) => gql(Q.removeSellerEditor, { seller, email });
export const importDeviceCatalogue = async () => fromJson((await gql(Q.importDeviceCatalogue)).importDeviceCatalogue);
