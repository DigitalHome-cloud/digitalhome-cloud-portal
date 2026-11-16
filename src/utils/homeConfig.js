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

/** The SmartHome ID of a homeId, or "" (only homes the user may list). */
export async function smartHomeIdOf(homeId) {
  let nextToken = null;
  do {
    const d = await call(HOME_IDS, { nextToken });
    const hit = (d.listDigitalHomes.items || []).find((h) => h.homeId === homeId);
    if (hit) return hit.smartHomeId || "";
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
  query HomeVaultItems($homeId: String!) {
    homeVaultItems(homeId: $homeId) {
      homeId
      items { sha256 kind name size contentType takenAt caption configVersion tags thumbUrl uploadedAt uploadedBy }
    }
  }
`;
/** Every item, each with its tags (the versions and options it documents). */
export const vaultItems = async (homeId) =>
  ((await call(ITEMS, { homeId })).homeVaultItems.items || []).map((it) => ({
    ...it,
    tags: it.tags && it.tags.length ? it.tags : it.configVersion ? [it.configVersion] : [],
  }));

const TAG = /* GraphQL */ `
  mutation TagHomeVaultItems($homeId: String!, $sha256s: [String]!, $add: [String], $remove: [String]) {
    tagHomeVaultItems(homeId: $homeId, sha256s: $sha256s, add: $add, remove: $remove)
  }
`;
/** Add and remove version tags on several items at once: [{ sha256, tags }]. */
export async function tagVaultItems(homeId, sha256s, { add = [], remove = [] } = {}) {
  const r = (await call(TAG, { homeId, sha256s, add, remove })).tagHomeVaultItems;
  return (typeof r === "string" ? JSON.parse(r) : r).items || [];
}

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

// ── JSON-LD and the graph view ──────────────────────────────────────────────

const XSD = "http://www.w3.org/2001/XMLSchema#";

async function parse(ttl) {
  const { Parser } = await import("n3");
  const prefixes = {};
  const quads = new Parser().parse(ttl || "", null, (p, ns) => { prefixes[p] = ns.value || String(ns); });
  return { quads, prefixes };
}

/** The Turtle as JSON-LD: the Turtle's prefixes as @context, one object per node in @graph. */
export async function toJsonLd(ttl) {
  const { quads, prefixes } = await parse(ttl);
  const entries = Object.entries(prefixes).sort((a, b) => b[1].length - a[1].length);
  const compact = (iri) => {
    for (const [p, ns] of entries) if (iri.startsWith(ns) && iri.length > ns.length) return `${p}:${iri.slice(ns.length)}`;
    return iri;
  };
  const value = (o) => {
    if (o.termType === "NamedNode") return { "@id": compact(o.value) };
    if (o.termType === "BlankNode") return { "@id": `_:${o.value}` };
    if (o.language) return { "@value": o.value, "@language": o.language };
    const dt = o.datatype?.value;
    if (!dt || dt === `${XSD}string`) return o.value;
    return { "@value": o.value, "@type": compact(dt) };
  };
  const nodes = new Map();
  for (const q of quads) {
    const id = q.subject.termType === "BlankNode" ? `_:${q.subject.value}` : compact(q.subject.value);
    if (!nodes.has(id)) nodes.set(id, { "@id": id });
    const n = nodes.get(id);
    const key = q.predicate.value === RDF_TYPE ? "@type" : compact(q.predicate.value);
    const v = key === "@type" ? compact(q.object.value) : value(q.object);
    n[key] = n[key] === undefined ? v : [].concat(n[key], v);
  }
  return { "@context": prefixes, "@graph": [...nodes.values()].sort((a, b) => a["@id"].localeCompare(b["@id"])) };
}

/** Nodes (every subject) and links (a statement whose object is another
 *  node) of one graph, or of two merged: each node then says whether it was
 *  added, removed, changed or is the same, and each link whether it is new or gone. */
export async function graphModel(ttl, otherTtl = null) {
  const pa = await parse(ttl);
  const pb = otherTtl == null ? null : await parse(otherTtl);
  const index = (quads) => {
    const facts = new Map();
    for (const q of quads) {
      const s = q.subject.value;
      if (!facts.has(s)) facts.set(s, new Map());
      facts.get(s).set(`${q.predicate.value} ${key(q.object)}`, q);
    }
    return facts;
  };
  // b is the graph shown; a (when given) is what it is compared with
  const fb = index(pa.quads);
  const fa = pb ? index(pb.quads) : null;
  const all = new Set([...fb.keys(), ...(fa ? fa.keys() : [])]);
  const nodes = [...all].map((s) => {
    const nb = fb.get(s), na = fa?.get(s);
    let status = "same";
    if (fa) {
      if (!na) status = "added";
      else if (!nb) status = "removed";
      else if ([...nb.keys()].some((k) => !na.has(k)) || [...na.keys()].some((k) => !nb.has(k))) status = "changed";
    }
    const d = describe(s, nb || na);
    const facts = [...(nb || na).values()];
    const props = {};
    for (const q of facts) {
      if (q.predicate.value === RDF_TYPE || q.predicate.value === RDFS_LABEL) continue;
      if (q.object.termType !== "Literal" && all.has(q.object.value)) continue;
      const p = short(q.predicate);
      (props[p] = props[p] || []).push(short(q.object));
    }
    return { iri: s, ...d, status, props };
  });
  const links = [];
  const seen = new Set();
  const addLinks = (facts) => {
    for (const [s, f] of facts) for (const q of f.values()) {
      if (q.object.termType === "Literal" || !all.has(q.object.value) || q.predicate.value === RDF_TYPE) continue;
      const k = `${s} ${q.predicate.value} ${q.object.value}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const inB = fb.get(s)?.has(`${q.predicate.value} ${key(q.object)}`);
      const inA = fa?.get(s)?.has(`${q.predicate.value} ${key(q.object)}`);
      links.push({ from: s, to: q.object.value, property: short(q.predicate), status: !fa ? "same" : inB && inA ? "same" : inB ? "added" : "removed" });
    }
  };
  addLinks(fb);
  if (fa) addLinks(fa);
  return { nodes, links };
}

/** Positions for the graph view: a small force layout, the same every time for the same graph. */
export function layout(model, width = 900, height = 560) {
  const n = model.nodes.length;
  const pos = model.nodes.map((_, i) => {
    const a = (2 * Math.PI * i) / Math.max(n, 1);
    return { x: width / 2 + (width / 3) * Math.cos(a), y: height / 2 + (height / 3) * Math.sin(a), vx: 0, vy: 0 };
  });
  const at = new Map(model.nodes.map((nd, i) => [nd.iri, i]));
  const edges = model.links.map((l) => [at.get(l.from), at.get(l.to)]).filter(([a, b]) => a != null && b != null && a !== b);
  const k = Math.sqrt((width * height) / Math.max(n, 1)) * 0.75;
  for (let it = 0; it < 300; it += 1) {
    const cool = 1 - it / 300;
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
      const dx = pos[i].x - pos[j].x || 0.01, dy = pos[i].y - pos[j].y || 0.01;
      const d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      const f = (k * k) / d2;
      pos[i].vx += (dx / d) * f; pos[i].vy += (dy / d) * f;
      pos[j].vx -= (dx / d) * f; pos[j].vy -= (dy / d) * f;
    }
    for (const [a, b] of edges) {
      const dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d * d) / k / 8;
      pos[a].vx -= (dx / d) * f; pos[a].vy -= (dy / d) * f;
      pos[b].vx += (dx / d) * f; pos[b].vy += (dy / d) * f;
    }
    for (const p of pos) {
      p.vx += (width / 2 - p.x) * 0.01; p.vy += (height / 2 - p.y) * 0.01;
      const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, step = Math.min(v, 40 * cool + 1);
      p.x = Math.min(width - 60, Math.max(60, p.x + (p.vx / v) * step));
      p.y = Math.min(height - 24, Math.max(24, p.y + (p.vy / v) * step));
      p.vx *= 0.5; p.vy *= 0.5;
    }
  }
  return pos.map(({ x, y }) => ({ x, y }));
}
