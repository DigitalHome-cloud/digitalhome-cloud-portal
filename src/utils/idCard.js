// The ID card of one item of a home's configuration: what someone standing
// at a socket, a switch or the board needs to know (darkfactory ADR 0018).
//
// A QR label from the pro edge opens /id/?h=<homeId>&i=<item>: the home's
// minted homeId and the item's minted id, never the SmartHome ID (it spells
// the address). The graph is read with the owners' own queries, so nobody
// else sees anything. card() is pure: quads in, plain data out.

const DHC = "https://digitalhome.cloud/ontology#";
const DHP = "https://digitalhome.cloud/pro#";
const REC = "https://w3id.org/rec#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LABEL = "http://www.w3.org/2000/01/rdf-schema#label";

/** The graph as subject → predicate → [objects]. */
export function index(quads) {
  const g = new Map();
  for (const q of quads) {
    const s = q.subject.value;
    if (!g.has(s)) g.set(s, new Map());
    const p = g.get(s);
    if (!p.has(q.predicate.value)) p.set(q.predicate.value, []);
    p.get(q.predicate.value).push(q.object);
  }
  return g;
}

const local = (iri) => String(iri).replace(/[#/]$/, "").split(/[#/]/).pop();
const one = (g, s, p) => (g.get(s)?.get(p) || [])[0];
const val = (g, s, p) => one(g, s, p)?.value;
const num = (g, s, p) => {
  const v = val(g, s, p);
  return v === undefined ? null : Number(v);
};
const types = (g, s) => (g.get(s)?.get(RDF_TYPE) || []).map((o) => o.value);
const is = (g, s, cls) => types(g, s).includes(cls);
const subjects = (g, p, o) => [...g.keys()].filter((s) => (g.get(s).get(p) || []).some((x) => x.value === o));

/** The IRI of the item with this local id, or null. */
export function find(g, item) {
  for (const s of g.keys()) if (local(s) === item) return s;
  return null;
}

function kindOf(g, s) {
  if (is(g, s, `${DHC}Circuit`)) return "circuit";
  if (is(g, s, `${DHC}RCD`)) return "rcd";
  if (is(g, s, `${DHC}DistributionBoard`)) return "board";
  if (val(g, s, `${DHP}onCircuit`)) return "point";
  if (val(g, s, `${DHP}onBoard`)) return "device";
  if (is(g, s, `${REC}Room`)) return "room";
  return "other";
}

const phaseText = (p) => (p ? (p.match(/L\d/g) || []).join("-") : "");

/** Where a board device sits: its board, row, module numbers. */
function place(g, dev) {
  const board = val(g, dev, `${DHP}onBoard`);
  if (!board) return null;
  const per = num(g, board, `${DHP}modulesPerRow`);
  const row = num(g, dev, `${DHP}row`);
  const slot = num(g, dev, `${DHP}slot`);
  const width = num(g, dev, `${DHP}modules`) || 1;
  const first = per && row && slot ? (row - 1) * per + slot : null;
  return {
    board: val(g, board, LABEL) || local(board),
    row,
    modules: first ? (width > 1 ? `${first}–${first + width - 1}` : String(first)) : "",
  };
}

function rcdOf(g, circuit) {
  return (g.get(circuit)?.get(`${DHC}hasProtection`) || []).map((o) => o.value).find((x) => is(g, x, `${DHC}RCD`)) || null;
}

function breakerOf(g, circuit) {
  return (g.get(circuit)?.get(`${DHC}hasProtection`) || []).map((o) => o.value).find((x) => !is(g, x, `${DHC}RCD`)) || null;
}

function rcdFacts(g, r) {
  if (!r) return null;
  return {
    id: local(r),
    label: val(g, r, LABEL) || local(r),
    sensitivity: num(g, r, `${DHC}sensitivityMA`),
    rating: num(g, r, `${DHC}ratedCurrent`),
    type: val(g, r, `${DHC}rcdType`) || "",
    phase: phaseText(val(g, r, `${DHP}phaseConductor`)),
    place: place(g, r),
    toVerify: val(g, r, `${DHP}toVerify`) === "true",
  };
}

function circuitFacts(g, c) {
  const r = rcdOf(g, c);
  const brk = breakerOf(g, c);
  const own = val(g, c, `${DHP}phaseConductor`);
  const inherited = r ? val(g, r, `${DHP}phaseConductor`) : null;
  return {
    id: local(c),
    label: val(g, c, LABEL) || local(c),
    rating: num(g, c, `${DHC}ratedCurrent`),
    section: num(g, c, `${DHC}crossSection`),
    threePhase: num(g, c, `${DHC}phase`) === 3,
    phase: phaseText(own || inherited),
    type: local(val(g, c, `${DHC}hasCircuitType`) || "").replace("CircuitType_", ""),
    appliance: val(g, c, `${DHP}appliance`) || "",
    breaker: brk ? { place: place(g, brk), kind: types(g, brk).some((t) => t.endsWith("ProtectionDevice")) ? "breaker" : "" } : null,
    rcd: rcdFacts(g, r),
    toVerify: val(g, c, `${DHP}toVerify`) === "true",
  };
}

function pointFacts(g, p) {
  const room = val(g, p, `${REC}locatedIn`);
  return {
    id: local(p),
    label: val(g, p, LABEL) || local(p),
    pointKind: val(g, p, `${DHP}kind`) || "",
    room: room ? val(g, room, LABEL) || local(room) : "",
  };
}

/** What the card shows for one item, or null if the graph has no such item. */
export function card(quads, item) {
  const g = index(quads);
  const s = find(g, item);
  if (!s) return null;
  const kind = kindOf(g, s);
  const base = {
    id: item,
    kind,
    label: val(g, s, LABEL) || item,
    labelText: val(g, s, `${DHP}labelText`) || "",
    reference: val(g, s, `${DHP}reference`) ? `${val(g, s, `${DHP}partner`) || ""} ${val(g, s, `${DHP}reference`)}`.trim() : "",
    toVerify: val(g, s, `${DHP}toVerify`) === "true",
  };
  if (kind === "point") {
    const c = val(g, s, `${DHP}onCircuit`);
    return { ...base, ...pointFacts(g, s), circuit: c ? circuitFacts(g, c) : null };
  }
  if (kind === "circuit") {
    const points = subjects(g, `${DHP}onCircuit`, s).map((p) => pointFacts(g, p));
    return { ...base, circuit: circuitFacts(g, s), points };
  }
  if (kind === "rcd") {
    const circuits = subjects(g, `${DHC}hasProtection`, s).filter((c) => is(g, c, `${DHC}Circuit`)).map((c) => circuitFacts(g, c));
    return { ...base, rcd: rcdFacts(g, s), circuits };
  }
  if (kind === "device") {
    return {
      ...base,
      rating: num(g, s, `${DHC}ratedCurrent`),
      sensitivity: num(g, s, `${DHC}sensitivityMA`),
      deviceType: local(types(g, s)[0] || ""),
      phase: phaseText(val(g, s, `${DHP}phaseConductor`)),
      place: place(g, s),
    };
  }
  return base;
}

/** The item id is minted (ws-…, circuit-…, pt-…): letters, digits and dashes only. */
export const validItem = (i) => typeof i === "string" && /^[a-z][a-z0-9-]{2,60}$/.test(i);
export const validHome = (h) => typeof h === "string" && /^h-[a-z2-9]{10}$/.test(h);
