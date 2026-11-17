// Two kinds of edge (darkfactory ADR 0020).
//
//   pro     works for the homes of the person who linked it: one workspace
//           per home, attached on the edge. Never linked to a home here.
//   devops  dedicated to one home, linked to it here.
//
// The backend reports the kind; an edge linked before it did is recognised
// by the tool name in its version, and anything else is a devops edge (the
// one-home model Fleet always had).

export const kindOf = (e) => {
  const k = e?.edge_kind;
  if (k === "pro" || k === "devops") return k;
  return /^digitalhome-pro-edge\b/i.test(String(e?.dhe_version || "")) ? "pro" : "devops";
};

const missingField = (err) =>
  /FieldUndefined|Cannot query field|Validation error/i.test(
    JSON.stringify(err?.errors || err?.message || String(err))
  );

/** Run a query; if the backend does not know its newer fields yet (the
 *  Portal deployed before the backend), run the older one instead. */
export async function graphqlWithFallback(client, args, olderQuery) {
  try {
    return await client.graphql(args);
  } catch (err) {
    if (olderQuery && missingField(err)) return client.graphql({ ...args, query: olderQuery });
    throw err;
  }
}
