import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSmartHome } from "../context/SmartHomeContext";
import { useTier } from "../utils/useTier";
import { UpgradePrompt } from "./UpgradePrompt";
import SmartHomeForm from "./SmartHomeForm";
import { generateClient } from "aws-amplify/api";
import { graphqlWithFallback, kindOf } from "../utils/edgeKind";
import { listDigitalHomes } from "../graphql/queries";
import {
  initiateDigitalHome,
  updateDigitalHome,
  deleteDigitalHome,
} from "../graphql/mutations";

// Fleet — the Manager (Digital Homes) and Edges merged into one screen, styled to
// the Overview shell theme (.ov). Each home lists its paired edge(s) nested
// beneath it, with status + firmware version. Pairing is initiated from the edge
// box itself; a small assign control remains only for edges not yet placed under
// a home.
//
// Two kinds of edge (darkfactory ADR 0020): a devops edge is dedicated to one
// home and sits under it; a pro edge works for all your homes, one workspace
// per home attached on the edge, so it gets no home here. It is listed on its
// own with the homes its workspaces use, and appears under each of them.

const client = generateClient();

const EDGE_FIELDS = `
      edge_id
      home_id
      machine_id
      hostname
      dhe_version
      status
      last_telemetry_at
      linked_at`;
const LIST_MY_EDGES = /* GraphQL */ `
  query ListMyEdges {
    listMyEdges {${EDGE_FIELDS}
      edge_kind
      work_homes
      work_homes_at
    }
  }
`;
// The backend before ADR 0020 (two kinds of edge) knows only these.
const LIST_MY_EDGES_OLD = /* GraphQL */ `
  query ListMyEdges {
    listMyEdges {${EDGE_FIELDS}
    }
  }
`;
const LINK_EDGE_TO_HOME = /* GraphQL */ `
  mutation LinkEdgeToHome($edge_id: String!, $home_id: String) {
    linkEdgeToHome(edge_id: $edge_id, home_id: $home_id) {
      edge_id
      home_id
    }
  }
`;

const shortId = (id) => (id ? id.replace(/^e-/, "").slice(0, 8) : "—");

// An edge reports dhe_version either as a bare version ("0.0.0-dev", the DevOps
// edge) or as "<tool> <version>" ("digitalhome-pro-edge 0.1.0", edges from
// template-dlab5-edge). Put the "v" before the version, not before the name.
export const edgeVersion = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return "—";
  const m = s.match(/^(?:(.*\S)\s+)?v?(\d[\w.+-]*)$/);
  if (!m) return s;
  return m[1] ? `${m[1]} v${m[2]}` : `v${m[2]}`;
};

// Status. For now an edge is "Active" as soon as it is added — the real up/down
// signal comes from the edge → cloud heartbeat, which lands with the edge data
// lake pipeline. When that exists, replace this with a heartbeat-recency check.
const isEdgeActive = (/* e */) => true;

const relTime = (iso) => {
  if (!iso) return null;
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const StatusPill = ({ active }) => (
  <span className={`ov-estat ${active ? "ov-estat--up" : "ov-estat--down"}`}>
    <span className="ov-estat-dot" />
    {active ? "Active" : "Down"}
  </span>
);

const EdgeRow = ({
  e,
  homes,
  onAssign,
  busy,
  assignable,
  choice,
  setChoice,
}) => {
  const added = relTime(e.linked_at);
  return (
    <div className="ov-edge">
      <span style={{ fontSize: "1rem" }} aria-hidden="true">
        🔌
      </span>
      <div className="ov-edge-id">
        <strong>{e.hostname || shortId(e.edge_id)}</strong>
        <div>
          {e.machine_id || shortId(e.edge_id)}
          {added ? ` · added ${added}` : ""}
        </div>
      </div>
      <StatusPill active={isEdgeActive(e)} />
      <span className="ov-edge-ver">
        {edgeVersion(e.dhe_version)}
      </span>
      <button
        type="button"
        className="ov-btn ov-btn--ghost"
        disabled
        title="Firmware updates from the Portal are coming soon"
      >
        Update
      </button>
      {assignable && (
        <span style={{ display: "inline-flex", gap: "0.4rem" }}>
          <select
            className="ov-input"
            value={choice[e.edge_id] ?? ""}
            onChange={(ev) =>
              setChoice((c) => ({ ...c, [e.edge_id]: ev.target.value }))
            }
          >
            <option value="">— assign to home —</option>
            {homes.map((h) => (
              <option key={h.smartHomeId} value={h.smartHomeId}>
                {h.smartHomeId}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ov-btn ov-btn--primary"
            disabled={busy === e.edge_id || !choice[e.edge_id]}
            onClick={() => onAssign(e.edge_id, choice[e.edge_id])}
          >
            {busy === e.edge_id ? "…" : "Assign"}
          </button>
        </span>
      )}
      {!assignable && (
        <button
          type="button"
          className="ov-btn ov-btn--ghost"
          disabled={busy === e.edge_id}
          onClick={() => onAssign(e.edge_id, null)}
          title="Unassign this edge from the home"
          style={{ marginLeft: "auto" }}
        >
          {busy === e.edge_id ? "…" : "Unassign"}
        </button>
      )}
    </div>
  );
};

// A pro edge: no home picker. The homes its workspaces use, as it last
// reported them (only those you may use); a pro edge linked to a home before
// ADR 0020 can be unlinked, which takes nothing away from it.
const ProEdgeRow = ({ e, homes, onUnlink, busy, onOpen }) => {
  const added = relTime(e.linked_at);
  const known = new Set(homes.map((h) => h.smartHomeId));
  const work = (e.work_homes || []).filter((h) => known.has(h));
  const reported = relTime(e.work_homes_at);
  return (
    <div className="ov-edge ov-edge--pro">
      <span style={{ fontSize: "1rem" }} aria-hidden="true">
        🧰
      </span>
      <div className="ov-edge-id">
        <strong>{e.hostname || shortId(e.edge_id)}</strong>
        <div>
          {e.machine_id || shortId(e.edge_id)}
          {added ? ` · added ${added}` : ""}
        </div>
        <div className="ov-edge-homes">
          {work.length > 0 ? (
            <>
              Workspaces for:{" "}
              {work.map((h) => (
                <button key={h} type="button" className="ov-chip" onClick={() => onOpen(h)} title="Make this the active home">
                  {h}
                </button>
              ))}
              {reported ? <span className="ov-dim"> · reported {reported}</span> : null}
            </>
          ) : e.work_homes_at ? (
            "No workspace attached to one of your homes yet."
          ) : (
            "Has not reported its workspaces yet: start or update the edge."
          )}
        </div>
      </div>
      <StatusPill active={isEdgeActive(e)} />
      <span className="ov-edge-ver">{edgeVersion(e.dhe_version)}</span>
      {e.home_id && (
        <button
          type="button"
          className="ov-btn ov-btn--ghost"
          disabled={busy === e.edge_id}
          onClick={onUnlink}
          title={`Linked to ${e.home_id} from before: a pro edge needs no home, unlinking takes nothing away`}
          style={{ marginLeft: "auto" }}
        >
          {busy === e.edge_id ? "…" : `Unlink from ${e.home_id}`}
        </button>
      )}
    </div>
  );
};

const FleetManager = () => {
  const auth = useAuth();
  const { authState, isAuthenticated } = auth;
  const { activeHome, setActiveHome } = useSmartHome();
  const { tier, can } = useTier(auth);
  const createResult = can("create.new_home");

  const [homes, setHomes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [busy, setBusy] = useState("");
  const [choice, setChoice] = useState({});

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated || typeof window === "undefined") return;
    setLoading(true);
    setError(null);
    try {
      const [homesRes, edgesRes] = await Promise.all([
        client.graphql({ query: listDigitalHomes }),
        graphqlWithFallback(client, { query: LIST_MY_EDGES, authMode: "userPool" }, LIST_MY_EDGES_OLD),
      ]);
      setHomes(homesRes.data.listDigitalHomes.items || []);
      setEdges(edgesRes?.data?.listMyEdges || []);
    } catch (err) {
      console.error("[Fleet] load failed:", err);
      setError("Failed to load your fleet.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (args) => {
    if (typeof window === "undefined") return;
    if (editingItem) {
      await client.graphql({
        query: updateDigitalHome,
        variables: {
          input: {
            smartHomeId: args.smartHomeId,
            city: args.city,
            addressLine1: args.addressLine1,
            addressLine2: args.addressLine2,
          },
        },
      });
    } else {
      const result = await client.graphql({
        query: initiateDigitalHome,
        variables: args,
      });
      const created = result.data.initiateDigitalHome;
      if (created?.smartHomeId) setActiveHome(created.smartHomeId);
    }
    setShowForm(false);
    setEditingItem(null);
    await fetchAll();
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete DigitalHome ${item.smartHomeId}?\n\nThis removes the metadata row only — the S3 designtime files and Cognito group are not removed by this action.`
      )
    )
      return;
    await client.graphql({
      query: deleteDigitalHome,
      variables: { input: { smartHomeId: item.smartHomeId } },
    });
    fetchAll();
  };

  const assign = async (edgeId, homeId) => {
    setBusy(edgeId);
    setError(null);
    setMessage("");
    try {
      await client.graphql({
        query: LINK_EDGE_TO_HOME,
        variables: { edge_id: edgeId, home_id: homeId || null },
        authMode: "userPool",
      });
      setMessage(homeId ? `Edge assigned to ${homeId}.` : "Edge unassigned.");
      await fetchAll();
    } catch (err) {
      console.error("linkEdgeToHome failed", err);
      setError(
        "Could not update the edge. You must own both the edge and the home."
      );
    } finally {
      setBusy("");
    }
  };

  const devops = edges.filter((e) => kindOf(e) === "devops");
  const pros = edges.filter((e) => kindOf(e) === "pro");
  const edgesByHome = devops.reduce((acc, e) => {
    if (e.home_id) (acc[e.home_id] = acc[e.home_id] || []).push(e);
    return acc;
  }, {});
  const prosByHome = pros.reduce((acc, e) => {
    for (const h of e.work_homes || []) (acc[h] = acc[h] || []).push(e);
    return acc;
  }, {});
  const unassigned = devops.filter(
    (e) => !e.home_id || !homes.some((h) => h.smartHomeId === e.home_id)
  );

  const formatAddress = (item) =>
    [item.addressLine1, item.city, item.postalCode]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <>
      {!showForm && (
        <div className="ov-toolbar">
          <button
            type="button"
            className="ov-btn ov-btn--primary"
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            disabled={!isAuthenticated || !createResult.allowed}
            title={
              !isAuthenticated
                ? "Sign in to create a DigitalHome"
                : !createResult.allowed
                ? "Your tier does not allow creating new homes"
                : undefined
            }
          >
            + Create DigitalHome
          </button>
          {isAuthenticated && !createResult.allowed && tier !== "guest" && (
            <UpgradePrompt
              required={createResult.requiredTier}
              current={tier}
              compact
            />
          )}
        </div>
      )}

      {error && <p className="ov-err">{error}</p>}
      {message && <p className="ov-msg">{message}</p>}

      {showForm && (
        <div style={{ marginBottom: "1.5rem" }}>
          <SmartHomeForm
            item={editingItem}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "#8a958f" }}>Loading…</p>
      ) : homes.length === 0 ? (
        <p style={{ color: "#8a958f" }}>
          {authState === "authenticated"
            ? "No DigitalHomes yet. Click + Create DigitalHome to start."
            : "Sign in to create and manage your DigitalHomes."}
        </p>
      ) : (
        homes.map((home) => {
          const isActive = activeHome?.id === home.smartHomeId;
          const homeEdges = edgesByHome[home.smartHomeId] || [];
          const homePros = prosByHome[home.smartHomeId] || [];
          return (
            <div key={home.smartHomeId} className="ov-panel">
              <div className="ov-home-head">
                <button
                  type="button"
                  className={`ov-pick${isActive ? " ov-pick--active" : ""}`}
                  onClick={() => setActiveHome(home.smartHomeId)}
                >
                  <span className="ov-pick-check" aria-hidden="true">
                    {isActive ? "✓" : ""}
                  </span>
                  {home.smartHomeId}
                </button>
                <span className="ov-home-addr">
                  {formatAddress(home)} · {home.country}
                </span>
                <span className="ov-pill">{home.isDemo ? "Demo" : "Real"}</span>
                <button
                  type="button"
                  className="ov-btn ov-btn--ghost"
                  onClick={() => {
                    setEditingItem(home);
                    setShowForm(true);
                  }}
                >
                  Modify
                </button>
                <button
                  type="button"
                  className="ov-btn ov-btn--danger"
                  onClick={() => handleDelete(home)}
                >
                  Delete
                </button>
              </div>
              {homeEdges.length > 0 ? (
                homeEdges.map((e) => (
                  <EdgeRow
                    key={e.edge_id}
                    e={e}
                    onAssign={assign}
                    busy={busy}
                  />
                ))
              ) : homePros.length === 0 ? (
                <div className="ov-noedge">
                  No edge paired — pair it from the edge box.
                </div>
              ) : null}
              {homePros.map((e) => (
                <div key={e.edge_id} className="ov-noedge ov-edge-pro-here">
                  🧰 {e.hostname || shortId(e.edge_id)} · pro edge, a workspace here
                </div>
              ))}
            </div>
          );
        })
      )}

      {pros.length > 0 && (
        <div className="ov-unassigned ov-pros">
          <div className="ov-unassigned-head">
            Pro edges ({pros.length}) — each works for all your homes; its
            workspaces are attached to their homes on the edge
          </div>
          {pros.map((e) => (
            <ProEdgeRow key={e.edge_id} e={e} homes={homes} onUnlink={() => assign(e.edge_id, null)}
                        busy={busy} onOpen={(id) => setActiveHome(id)} />
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="ov-unassigned">
          <div className="ov-unassigned-head">
            Unassigned edges ({unassigned.length}) — assign each to one of your
            homes
          </div>
          {unassigned.map((e) => (
            <EdgeRow
              key={e.edge_id}
              e={e}
              homes={homes}
              onAssign={assign}
              busy={busy}
              assignable
              choice={choice}
              setChoice={setChoice}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default FleetManager;
