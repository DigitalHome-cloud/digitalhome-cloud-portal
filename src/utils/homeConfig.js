// A home's configurations and vault (darkfactory ADRs 0018, 0019).
//
// Everything is keyed on the home's meaningless homeId (h-…), never on the
// SmartHome ID: the active home (a SmartHome ID) is looked up once to find it.
// The Lambdas allow the home's owners and dhc-admins only.

import { generateClient } from "aws-amplify/api";

const client = generateClient();
const call = async (query, variables = {}) => {
  const r = await client.graphql({ query, variables, authMode: "userPool" });
  return r.data;
};

const HOME_IDS = /* GraphQL */ `
  query HomeIds($nextToken: String) {
    listDigitalHomes(limit: 200, nextToken: $nextToken) {
      items { smartHomeId homeId }
      nextToken
    }
  }
`;

/** The homeId of a SmartHome ID, or "" while the home has none yet. */
export async function homeIdOf(smartHomeId) {
  let nextToken = null;
  do {
    const d = await call(HOME_IDS, { nextToken });
    const hit = (d.listDigitalHomes.items || []).find((h) => h.smartHomeId === smartHomeId);
    if (hit) return hit.homeId || "";
    nextToken = d.listDigitalHomes.nextToken;
  } while (nextToken);
  return "";
}

const OVERVIEW = /* GraphQL */ `
  query HomeConfigurations($homeId: String!) {
    homeConfigurations(homeId: $homeId) {
      homeId
      live
      versions { id version status kind basedOn fromOption triples summary at by }
      options { id label basedOn status promotedTo version updatedAt updatedBy }
    }
  }
`;
export const configurations = async (homeId) => (await call(OVERVIEW, { homeId })).homeConfigurations;

const GRAPH = /* GraphQL */ `
  query HomeConfigurationGraph($homeId: String!, $id: String!) {
    homeConfigurationGraph(homeId: $homeId, id: $id) { id kind version url }
  }
`;
/** A presigned URL (15 minutes) for a version's or an option's Turtle. */
export const graphUrl = async (homeId, id) => (await call(GRAPH, { homeId, id })).homeConfigurationGraph;

export async function graphText(homeId, id) {
  const g = await graphUrl(homeId, id);
  if (!g?.url) return "";
  const r = await fetch(g.url);
  if (!r.ok) throw new Error(`could not read ${id} (${r.status})`);
  return r.text();
}

const ITEMS = /* GraphQL */ `
  query HomeVaultItems($homeId: String!, $configVersion: String) {
    homeVaultItems(homeId: $homeId, configVersion: $configVersion) {
      homeId
      items { sha256 kind name size contentType takenAt caption configVersion thumbUrl uploadedAt uploadedBy }
    }
  }
`;
export const vaultItems = async (homeId) => (await call(ITEMS, { homeId })).homeVaultItems.items || [];

const ITEM_URL = /* GraphQL */ `
  query HomeVaultItemUrl($homeId: String!, $sha256: String!) {
    homeVaultItemUrl(homeId: $homeId, sha256: $sha256) { status sha256 url }
  }
`;
/** A presigned URL for an original: inline for a picture, attachment otherwise. */
export const vaultItemUrl = async (homeId, sha256) => (await call(ITEM_URL, { homeId, sha256 })).homeVaultItemUrl;

// ── comparing two configurations, node by node (as the pro edge does) ──────

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

const short = (term) => {
  if (term.termType === "Literal") return term.value;
  const v = term.value;
  const cut = Math.max(v.lastIndexOf("#"), v.lastIndexOf("/"));
  return cut >= 0 ? v.slice(cut + 1) : v;
};
const key = (term) => `${term.termType}|${term.value}|${term.language || ""}|${term.datatype?.value || ""}`;

async function nodes(ttl) {
  const { Parser } = await import("n3");
  const out = new Map();
  for (const q of new Parser().parse(ttl || "")) {
    const s = q.subject.value;
    if (!out.has(s)) out.set(s, new Map());
    out.get(s).set(`${q.predicate.value} ${key(q.object)}`, q);
  }
  return out;
}

function describe(s, facts) {
  const qs = [...facts.values()];
  const label = qs.find((q) => q.predicate.value === RDFS_LABEL)?.object.value || "";
  const types = qs.filter((q) => q.predicate.value === RDF_TYPE).map((q) => short(q.object)).sort();
  const id = s.slice(Math.max(s.lastIndexOf("#"), s.lastIndexOf("/")) + 1);
  return { id, type: types[0] || "", label };
}

/** What changed from Turtle a to Turtle b: added, removed and changed
 *  nodes, and for a changed node each property's values before and after. */
export async function compare(a, b) {
  const [na, nb] = await Promise.all([nodes(a), nodes(b)]);
  const added = [], removed = [], changed = [];
  for (const [s, f] of nb) if (!na.has(s)) added.push(describe(s, f));
  for (const [s, f] of na) if (!nb.has(s)) removed.push(describe(s, f));
  for (const [s, fa] of na) {
    const fb = nb.get(s);
    if (!fb) continue;
    const diff = new Set();
    for (const [k, q] of fa) if (!fb.has(k)) diff.add(q.predicate.value);
    for (const [k, q] of fb) if (!fa.has(k)) diff.add(q.predicate.value);
    if (!diff.size) continue;
    const values = (f, p) => [...f.values()].filter((q) => q.predicate.value === p).map((q) => short(q.object)).sort();
    changed.push({
      ...describe(s, fb),
      changes: [...diff].sort().map((p) => ({
        property: p.slice(Math.max(p.lastIndexOf("#"), p.lastIndexOf("/")) + 1),
        before: values(fa, p),
        after: values(fb, p),
      })),
    });
  }
  const order = (x, y) => (x.type + x.label + x.id).localeCompare(y.type + y.label + y.id);
  return { added: added.sort(order), removed: removed.sort(order), changed: changed.sort(order) };
}

/** "0001-0000" from "h-…-0001-0000", "p01" from "h-…-p01". */
export const shortId = (homeId, id) => (id && homeId && id.startsWith(`${homeId}-`) ? id.slice(homeId.length + 1) : id || "");

export const bytes = (n) => {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
